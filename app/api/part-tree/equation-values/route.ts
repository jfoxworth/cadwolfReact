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

  const components = await db.component.findMany({
    where: {
      fileId: { in: fileIds },
      componentTypeId: { in: [3, 4] },
      deletedAt: null,
      name: { equals: variableName.trim(), mode: "insensitive" },
    },
    select: { fileId: true, name: true, content: true, order: true },
    orderBy: { order: "asc" },
  });

  const byFile = new Map<
    number,
    { value: number | null; unit: string | null }
  >();

  for (const comp of components) {
    let value: number | null = null;
    let unit: string | null = null;

    try {
      const parsed = JSON.parse(comp.content ?? "{}");
      const eq = parsed.Equation as Record<string, unknown> | undefined;
      const solutionReal = eq?.Solution_real as
        | Record<string, number>
        | undefined;
      value =
        typeof solutionReal?.["0-0"] === "number" ? solutionReal["0-0"] : null;
      unit = (eq?.Units_units as string | undefined) ?? null;
    } catch {
      /* ignore */
    }

    byFile.set(comp.fileId, { value, unit });
  }

  const results = fileIds.map((id) => ({
    fileId: id,
    ...(byFile.get(id) ?? { value: null, unit: null }),
  }));

  return NextResponse.json(results);
}
