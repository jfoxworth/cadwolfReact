import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
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

  let info: ConnInfo = {};
  try { info = JSON.parse(conn.info); } catch { /* ignore */ }

  const equations = Array.isArray(info.equations) ? info.equations : [];
  if (equations.length === 0) {
    return NextResponse.json({ pushed: 0 });
  }

  if (conn.cadType === "onshape") {
    if (!info.documentId || !info.workspaceId || !info.elementId) {
      return NextResponse.json({ error: "Connection not fully configured" }, { status: 400 });
    }

    await pushVariablesToOnshape(
      info.documentId,
      info.workspaceId,
      info.elementId,
      equations,
      body.results,
    );

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
