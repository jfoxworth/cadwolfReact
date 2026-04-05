import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";
import { checkPermission } from "@/utils/checkPermission";
import { getPartMassProperties } from "@/utils/onshape";

// POST /api/file/[id]/refresh-cad-properties
// Fetches live Onshape mass properties per-part and merges them into item_data.importedCAD.
// Uses the per-part API (/parts/d/{}/w/{}/e/{}/partid/{}/massproperties) so only the
// specific named part is fetched — never the aggregate "-all-" body.
// Existing importedCAD entries for OTHER eqnames are preserved (merge, not replace).
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { userId } = await getSessionUser();
  const fileId = Number(id);

  const canEdit = await checkPermission(fileId, userId, "edit");
  if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const allConns = await db.cadConnection.findMany({
    where: { documentId: String(fileId), cadType: "onshape", deletedAt: null },
  });
  if (!allConns.length) return NextResponse.json({ error: "No Onshape connection" }, { status: 404 });

  function parseInfo(conn: { info: string; cadId: string | null }) {
    let raw: Record<string, unknown> = {};
    try { raw = JSON.parse(conn.info); } catch { /* ignore */ }
    // Normalize legacy cad_data format to new format
    const cadData = raw.cad_data as Record<string, unknown> | undefined;
    if (cadData && !raw.documentId) {
      const ws = cadData.defaultWorkspace as Record<string, unknown> | undefined;
      raw = {
        ...raw,
        documentId:  String(cadData.id ?? conn.cadId ?? ""),
        workspaceId: String(ws?.id ?? ""),
        elementId:   String(cadData.element_id ?? cadData.defaultElementId ?? ""),
      };
    }
    return raw as {
      documentId?: string;
      workspaceId?: string;
      elementId?: string;
      parts?: Array<{ cadwolfName: string; partId: string }>;
    };
  }

  // Prefer the connection that has a parts mapping
  const connWithParts = allConns.find((c: { info: string }) => {
    try {
      const r = JSON.parse(c.info) as Record<string, unknown>;
      return Array.isArray(r.parts) && (r.parts as unknown[]).length > 0;
    } catch { return false; }
  });
  const conn = connWithParts ?? allConns[0];
  const info = parseInfo(conn);

  if (!info.documentId || !info.workspaceId || !info.elementId) {
    return NextResponse.json({ error: "Connection not fully configured" }, { status: 400 });
  }

  const parts = info.parts ?? [];
  if (!parts.length) {
    return NextResponse.json({ error: "No parts mapped in connection" }, { status: 400 });
  }

  // Load existing importedCAD to merge into (preserves entries not in this connection)
  const fileRecord = await db.file.findUnique({ where: { id: fileId }, select: { itemData: true } });
  if (!fileRecord) return NextResponse.json({ error: "File not found" }, { status: 404 });

  let itemData: Record<string, unknown> = {};
  try { itemData = JSON.parse(fileRecord.itemData); } catch { /* ignore */ }
  const existingEntries = Array.isArray(itemData.importedCAD)
    ? (itemData.importedCAD as Array<Record<string, unknown>>)
    : [];

  const updatedEntries = [...existingEntries];
  const fetchedAt = new Date().toISOString();
  const refreshedNames: string[] = [];
  const errors: string[] = [];

  // Fetch each part individually using the per-part API
  for (const part of parts) {
    const { cadwolfName, partId } = part;
    if (!cadwolfName || !partId) continue;

    let rawBody: Record<string, unknown> | null = null;
    try {
      rawBody = await getPartMassProperties(info.documentId!, info.workspaceId!, info.elementId!, partId);
    } catch (err) {
      errors.push(`${cadwolfName}: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
    if (!rawBody) {
      errors.push(`${cadwolfName}: no body data returned`);
      continue;
    }

    // Store in legacy format so the transformer reads it correctly at index 1 (SI units)
    const newEntry: Record<string, unknown> = {
      eqname:    cadwolfName,
      type:      "onshape",
      id:        String(conn.id),
      part_data: { partId, name: cadwolfName },
      mass_data: { bodies: { [partId]: rawBody } },
    };

    // Merge: replace existing entry with same eqname, or append
    const idx = updatedEntries.findIndex((e) => String(e.eqname ?? "") === cadwolfName);
    if (idx >= 0) updatedEntries[idx] = newEntry;
    else updatedEntries.push(newEntry);
    refreshedNames.push(cadwolfName);
  }

  itemData.importedCAD = updatedEntries;
  itemData.importedCadFetchedAt = fetchedAt;

  await db.file.update({
    where: { id: fileId },
    data: { itemData: JSON.stringify(itemData) },
  });

  return NextResponse.json({
    importedCad:          refreshedNames.map((name) => ({ eqname: name })),
    importedCadFetchedAt: fetchedAt,
    ...(errors.length ? { errors } : {}),
  });
}

// DELETE /api/file/[id]/refresh-cad-properties?eqname=X
// Removes a single entry from item_data.importedCAD by eqname.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { userId } = await getSessionUser();
  const fileId = Number(id);

  const canEdit = await checkPermission(fileId, userId, "edit");
  if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const eqname = req.nextUrl.searchParams.get("eqname");
  if (!eqname) return NextResponse.json({ error: "eqname required" }, { status: 400 });

  const fileRecord = await db.file.findUnique({ where: { id: fileId }, select: { itemData: true } });
  if (!fileRecord) return NextResponse.json({ error: "File not found" }, { status: 404 });

  let itemData: Record<string, unknown> = {};
  try { itemData = JSON.parse(fileRecord.itemData); } catch { /* ignore */ }

  const existing = itemData.importedCAD as Array<Record<string, unknown>> | undefined;
  itemData.importedCAD = Array.isArray(existing)
    ? existing.filter((e) => String(e.eqname ?? "") !== eqname)
    : [];

  await db.file.update({
    where: { id: fileId },
    data: { itemData: JSON.stringify(itemData) },
  });

  return NextResponse.json({ ok: true });
}
