import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";

// POST /api/datapoint — add a datapoint to a dataset
export async function POST(req: NextRequest) {
  const { userId } = await getSessionUser();
  const body = await req.json();
  const { datasetId, content, datapointTypeId } = body;

  const dataset = await db.dataset.findUnique({ where: { id: Number(datasetId) }, select: { userId: true } });
  if (!dataset) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (dataset.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const count = await db.datapoint.count({
    where: { datasetId, deletedAt: null },
  });

  const datapoint = await db.datapoint.create({
    data: {
      datasetId,
      content: String(content),
      datapointTypeId: datapointTypeId ?? 1,
      order: count,
    },
  });

  return NextResponse.json({ created: true, id: datapoint.id }, { status: 201 });
}
