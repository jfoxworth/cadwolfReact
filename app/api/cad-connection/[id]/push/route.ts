import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { isReauthError } from "@/utils/cadAuth";
import { pushVariablesToOnshape } from "@/utils/onshape";
import { pushParametersToFusion } from "@/utils/fusion";

interface ConnInfo {
  // Onshape
  documentId?: string;
  workspaceId?: string;
  elementId?: string;
  equations?: Array<{ varName: string; cadParamName: string }>;
  // Fusion
  projectId?: string;
  versionId?: string;
}

// Mirrors normalizeInfo in GET route — converts legacy Laravel cad_data format to new format.
function normalizeInfo(raw: Record<string, unknown>): ConnInfo {
  if (raw.documentId !== undefined || raw.cad_data === undefined) return raw as ConnInfo;

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
    documentId:  String(cadData.id ?? ""),
    workspaceId: String(ws?.id ?? ""),
    elementId:   String(cadData.element_id ?? cadData.defaultElementId ?? ""),
    equations,
  };
}

// POST /api/cad-connection/[id]/push
// Body: { results: Record<string, { value: number|string; units?: string }> }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json() as { results: Record<string, { value: number | string; units?: string }> };

  const conn = await db.cadConnection.findUnique({ where: { id: Number(id) } });
  if (!conn) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let raw: Record<string, unknown> = {};
  try { raw = JSON.parse(conn.info); } catch { /* ignore */ }
  const info = normalizeInfo(raw);

  const equations = Array.isArray(info.equations) ? info.equations : [];
  if (equations.length === 0) {
    return NextResponse.json({ pushed: 0 });
  }

  if (conn.cadType === "onshape") {
    if (!info.documentId || !info.workspaceId || !info.elementId) {
      return NextResponse.json({ error: "Connection not fully configured" }, { status: 400 });
    }

    try {
      await pushVariablesToOnshape(
        info.documentId,
        info.workspaceId,
        info.elementId,
        equations,
        body.results,
      );
    } catch (err) {
      if (isReauthError(err)) {
        return NextResponse.json({ error: "reauth_required", provider: "onshape" }, { status: 401 });
      }
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[cad-push/onshape]", msg);
      return NextResponse.json({ error: msg }, { status: 502 });
    }

  } else if (conn.cadType === "fusion") {
    if (!info.projectId || !info.versionId) {
      return NextResponse.json({ error: "Fusion connection not fully configured" }, { status: 400 });
    }

    // Map CadWolf solver results → Fusion parameter expressions
    const parameters = equations
      .map((eq) => {
        const result = body.results[eq.varName.toLowerCase()];
        if (result === undefined) return null;
        const value = result.units
          ? `${result.value} ${result.units}`
          : String(result.value);
        return { name: eq.cadParamName, value };
      })
      .filter((p): p is { name: string; value: string } => p !== null);

    if (parameters.length === 0) {
      return NextResponse.json({ pushed: 0 });
    }

    await pushParametersToFusion(info.projectId, info.versionId, parameters);

  } else {
    return NextResponse.json({ error: "Unknown CAD type" }, { status: 400 });
  }

  return NextResponse.json({ pushed: equations.length });
}
