import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";

// PUT /api/datapoint/[id] — update content
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { userId } = await getSessionUser();

  const existing = await db.datapoint.findUnique({
    where: { id: Number(id) },
    select: { dataset: { select: { userId: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.dataset.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { content } = await req.json();

  const datapoint = await db.datapoint.update({
    where: { id: Number(id) },
    data: { content: String(content) },
  });

  return NextResponse.json({ id: datapoint.id, content: datapoint.content });
}

// DELETE /api/datapoint/[id] — soft delete
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { userId } = await getSessionUser();

  const existing = await db.datapoint.findUnique({
    where: { id: Number(id) },
    select: { dataset: { select: { userId: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.dataset.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.datapoint.update({
    where: { id: Number(id) },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ deleted: true });
}
