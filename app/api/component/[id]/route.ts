import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { componentToBlock } from "@/utils/transformers";
import { getSessionUser } from "@/utils/getSessionUser";
import { checkPermission } from "@/utils/checkPermission";

// PUT /api/component/[id] — save block content/definition
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { userId } = await getSessionUser();
  const numId = Number(id);

  const existing = await db.component.findUnique({ where: { id: numId }, select: { fileId: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const canEdit = await checkPermission(existing.fileId, userId, "edit");
  if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { content, name, order } = body;

  const component = await db.component.update({
    where: { id: numId },
    data: {
      ...(content !== undefined && { content }),
      ...(name !== undefined && { name }),
      ...(order !== undefined && { order }),
    },
  });

  return NextResponse.json(componentToBlock(component));
}

// DELETE /api/component/[id] — soft delete and compact order
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { userId } = await getSessionUser();
  const numId = Number(id);

  const component = await db.component.findUniqueOrThrow({ where: { id: numId } });

  const canEdit = await checkPermission(component.fileId, userId, "edit");
  if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.component.update({
    where: { id: numId },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ deleted: true });
}
