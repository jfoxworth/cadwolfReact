import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";
import { checkPermission } from "@/utils/checkPermission";

// GET /api/dataset-import?fileId=123
export async function GET(req: NextRequest) {
  const { userId } = await getSessionUser();
  const fileId = Number(req.nextUrl.searchParams.get("fileId"));
  if (!fileId) return NextResponse.json({ error: "fileId required" }, { status: 400 });

  const canView = await checkPermission(fileId, userId, "view");
  if (!canView) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const imports = await db.datasetImport.findMany({
    where:   { fileId },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(imports);
}

// POST /api/dataset-import — create a new dataset import
export async function POST(req: NextRequest) {
  const { userId } = await getSessionUser();
  const body = await req.json();
  const { fileId, datasetId, datasetName, localAlias, cachedValues, datapointCount, matrixSize } = body;

  const canEdit = await checkPermission(Number(fileId), userId, "edit");
  if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const count = await db.datasetImport.count({ where: { fileId } });

  const entry = await db.datasetImport.create({
    data: {
      fileId,
      datasetId,
      datasetName:    datasetName    ?? "",
      localAlias:     localAlias     ?? datasetName ?? "",
      cachedValues:   cachedValues   ?? null,
      datapointCount: datapointCount ?? 0,
      matrixSize:     matrixSize     ?? null,
      needsUpdate:    false,
      order:          count,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
