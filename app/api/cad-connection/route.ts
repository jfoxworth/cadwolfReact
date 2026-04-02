import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { getSessionUser, getSessionUserOrNull } from "@/utils/getSessionUser";
import { checkPermission } from "@/utils/checkPermission";

// Normalize legacy info JSON (old Laravel format) to new format.
// Old format: { cad_data: { id, defaultWorkspace, element_id, element_name, name }, equations: [{ eq_name, conn_id }] }
// New format: { documentId, workspaceId, elementId, documentName, elementName, equations: [{ varName, cadParamName }] }
function normalizeInfo(raw: Record<string, unknown>): Record<string, unknown> {
  // Already new format if it has documentId or no cad_data
  if (raw.documentId !== undefined || raw.cad_data === undefined) return raw;

  const cadData = (typeof raw.cad_data === "string"
    ? (() => { try { return JSON.parse(raw.cad_data as string); } catch { return {}; } })()
    : raw.cad_data) as Record<string, unknown>;

  const ws = cadData.defaultWorkspace as Record<string, unknown> | undefined;
  const equations = ((raw.equations as Array<Record<string, unknown>>) ?? [])
    .filter((e) => e.eq_name)
    .map((e) => ({
      varName:      String(e.eq_name),
      cadParamName: String(e.eq_name), // conn_id is a numeric DB record ID, eq_name is the Onshape variable name
    }));

  return {
    documentId:   String(cadData.id ?? ""),
    workspaceId:  String(ws?.id ?? ""),
    elementId:    String(cadData.element_id ?? cadData.defaultElementId ?? ""),
    documentName: String(cadData.name ?? ""),
    elementName:  String(cadData.element_name ?? ""),
    equations,
    parts: raw.parts ?? [],
  };
}

// GET /api/cad-connection?fileId=24
export async function GET(req: NextRequest) {
  const session = await getSessionUserOrNull();
  const userId = session?.userId ?? 0;
  const fileId = req.nextUrl.searchParams.get("fileId");
  if (!fileId) return NextResponse.json([]);

  const canView = await checkPermission(Number(fileId), userId, "view");
  if (!canView) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const connections = await db.cadConnection.findMany({
    where: { documentId: fileId, deletedAt: null },
    orderBy: { id: "asc" },
  });

  return NextResponse.json(
    connections.map((c) => {
      let raw: Record<string, unknown> = {};
      try { raw = JSON.parse(c.info); } catch { /* ignore */ }
      return { id: c.id, cadType: c.cadType, info: normalizeInfo(raw) };
    }),
  );
}

// POST /api/cad-connection
// Body: { fileId: number, cadType: "onshape"|"fusion", info: object }
export async function POST(req: NextRequest) {
  const { userId } = await getSessionUser();
  const body = await req.json() as { fileId: number; cadType: string; info: Record<string, unknown> };
  const documentId = String(body.fileId);

  const canEdit = await checkPermission(body.fileId, userId, "edit");
  if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const cadType = body.cadType ?? "onshape";
  const infoJson = JSON.stringify(body.info ?? {});

  try {
    // Update existing connection if one exists, otherwise create
    const existing = await db.cadConnection.findFirst({
      where: { documentId, cadType, deletedAt: null },
      orderBy: { id: "desc" },
    });

    if (existing) {
      await db.cadConnection.update({
        where: { id: existing.id },
        data: { info: infoJson },
      });
      return NextResponse.json({ id: existing.id });
    }

    const conn = await db.cadConnection.create({
      data: { documentId, cadType, info: infoJson, cadId: "" },
    });
    return NextResponse.json({ id: conn.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[cad-connection POST]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
