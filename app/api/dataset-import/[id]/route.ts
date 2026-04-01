import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";
import { checkPermission } from "@/utils/checkPermission";

// PUT /api/dataset-import/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { userId } = await getSessionUser();

  const existing = await db.datasetImport.findUnique({ where: { id: Number(id) }, select: { fileId: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const canEdit = await checkPermission(existing.fileId, userId, "edit");
  if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();

  const entry = await db.datasetImport.update({
    where: { id: Number(id) },
    data: {
      localAlias:     body.localAlias     ?? undefined,
      cachedValues:   body.cachedValues   ?? undefined,
      datapointCount: body.datapointCount ?? undefined,
      matrixSize:     body.matrixSize     ?? undefined,
      needsUpdate:    body.needsUpdate    ?? undefined,
    },
  });

  return NextResponse.json(entry);
}

// DELETE /api/dataset-import/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { userId } = await getSessionUser();

  const existing = await db.datasetImport.findUnique({ where: { id: Number(id) }, select: { fileId: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const canEdit = await checkPermission(existing.fileId, userId, "edit");
  if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.datasetImport.delete({ where: { id: Number(id) } });
  return NextResponse.json({ deleted: true });
}
