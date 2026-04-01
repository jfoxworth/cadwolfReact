import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";

// PUT /api/dataset/[id] — update name or description
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { userId } = await getSessionUser();
  const datasetId = Number(id);

  const existing = await db.dataset.findUnique({ where: { id: datasetId }, select: { userId: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, description } = body;

  const dataset = await db.dataset.update({
    where: { id: datasetId },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
    },
  });

  return NextResponse.json({ id: dataset.id, name: dataset.name });
}

// DELETE /api/dataset/[id] — soft delete
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { userId } = await getSessionUser();
  const datasetId = Number(id);

  const existing = await db.dataset.findUnique({ where: { id: datasetId }, select: { userId: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.dataset.update({
    where: { id: datasetId },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ deleted: true });
}
