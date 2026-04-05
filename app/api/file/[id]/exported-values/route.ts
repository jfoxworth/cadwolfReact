import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";
import { checkPermission } from "@/utils/checkPermission";

// GET /api/file/[id]/exported-values
// Returns the current solved value for every equation block in the file,
// keyed by variable name (the LHS of the raw equation string).
// Used by dependent documents at load time to pull fresh values from source files.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { userId } = await getSessionUser();
  const fileId = Number(id);

  const canView = await checkPermission(fileId, userId, "view");
  if (!canView) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const components = await db.component.findMany({
    where: { fileId, inEdit: 1, deletedAt: null },
    select: { content: true },
  });

  const result: Record<string, { value: string; units: string | null }> = {};

  for (const c of components) {
    let raw: Record<string, unknown> = {};
    try { raw = JSON.parse(c.content ?? "{}"); } catch { continue; }

    if (raw._v2 !== true) continue;

    const rawEq = (raw.raw as string) ?? "";
    const lhs = rawEq.split("=")[0].trim();
    if (!lhs) continue;

    const sol = raw.solution as Record<string, unknown> | undefined;
    if (!sol) continue;

    const real = sol.real as Record<string, number> | undefined;
    const scalar = real?.["0-0"];
    if (scalar === undefined) continue;

    result[lhs] = {
      value: String(scalar),
      units: (sol.units as string | null | undefined) ?? null,
    };
  }

  return NextResponse.json(result);
}
