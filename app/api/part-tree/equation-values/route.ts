import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";

// POST /api/part-tree/equation-values
// Body: { fileIds: number[], variableName: string }
// Returns: Array<{ fileId: number, value: number | null, unit: string | null }>
export async function POST(req: NextRequest) {
  await getSessionUser();

  const { fileIds, variableName } = (await req.json()) as {
    fileIds: number[];
    variableName: string;
  };

  if (
    !Array.isArray(fileIds) ||
    fileIds.length === 0 ||
    !variableName?.trim()
  ) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const varLower = variableName.trim().toLowerCase();

  // Fetch all equation/slider components for the given files — we match by
  // variable name extracted from content since _v2 blocks store name in raw.
  const components = await db.component.findMany({
    where: {
      fileId: { in: fileIds },
      componentTypeId: { in: [3, 4] },
      deletedAt: null,
      inEdit: 1,
    },
    select: { fileId: true, content: true, order: true },
    orderBy: { order: "asc" },
  });

  const byFile = new Map<
    number,
    { value: number | null; unit: string | null }
  >();

  for (const comp of components) {
    let value: number | null = null;
    let unit: string | null = null;
    let matchedName = false;

    try {
      const parsed = JSON.parse(comp.content ?? "{}");

      if (parsed._v2 === true) {
        // New format: variable name is LHS of raw equation string
        const raw = (parsed.raw as string | undefined) ?? "";
        const lhs = raw.split("=")[0].trim();
        if (lhs.toLowerCase() !== varLower) continue;
        matchedName = true;
        const sol = parsed.solution as { real?: Record<string, number>; units?: string } | undefined;
        value = typeof sol?.real?.["0-0"] === "number" ? sol.real["0-0"] : null;
        unit = sol?.units ?? null;
      } else {
        // Legacy Laravel format: name stored in Equation field
        const eq = parsed.Equation as Record<string, unknown> | undefined;
        const name = ((eq?.Name ?? parsed.Name) as string | undefined) ?? "";
        if (name.toLowerCase() !== varLower) continue;
        matchedName = true;
        const solutionReal = eq?.Solution_real as Record<string, number> | undefined;
        value = typeof solutionReal?.["0-0"] === "number" ? solutionReal["0-0"] : null;
        unit = (eq?.Units_units as string | undefined) ?? null;
      }
    } catch {
      /* ignore */
    }

    if (matchedName && !byFile.has(comp.fileId)) {
      byFile.set(comp.fileId, { value, unit });
    }
  }

  const results = fileIds.map((id) => ({
    fileId: id,
    ...(byFile.get(id) ?? { value: null, unit: null }),
  }));

  return NextResponse.json(results);
}
