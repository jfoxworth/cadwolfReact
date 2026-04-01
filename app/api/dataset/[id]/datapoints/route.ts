import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";

// GET /api/dataset/[id]/datapoints
// Returns an ordered array of parsed numeric values (or raw strings if not numeric).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { userId } = await getSessionUser();

  const dataset = await db.dataset.findUnique({ where: { id: Number(id) }, select: { userId: true } });
  if (!dataset) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (dataset.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const datapoints = await db.datapoint.findMany({
    where:   { datasetId: Number(id), deletedAt: null },
    orderBy: { order: "asc" },
    select:  { content: true },
  });

  const values = datapoints.map((dp) => {
    const n = Number(dp.content);
    return isNaN(n) ? dp.content : n;
  });

  return NextResponse.json(values);
}
