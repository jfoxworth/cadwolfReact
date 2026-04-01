import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { fileToItem } from "@/utils/transformers";
import { getSessionUser } from "@/utils/getSessionUser";
import { checkPermission } from "@/utils/checkPermission";

// PUT /api/file/[id] — update name or itemData (requires edit permission)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { userId } = await getSessionUser();
  const fileId = Number(id);

  const canEdit = await checkPermission(fileId, userId, "edit");
  if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, itemData, description, quantity, parentId } = body;

  // Moving to a new parent requires edit permission on the target
  if (parentId !== undefined) {
    const canEditTarget = await checkPermission(Number(parentId), userId, "edit");
    if (!canEditTarget) return NextResponse.json({ error: "No edit permission on destination" }, { status: 403 });
  }

  // Merge patch fields (description, quantity) into the existing itemData JSON
  let mergedItemData = itemData;
  if ((description !== undefined || quantity !== undefined) && mergedItemData === undefined) {
    const existing = await db.file.findUnique({ where: { id: fileId }, select: { itemData: true } });
    let parsed: Record<string, unknown> = {};
    try { parsed = JSON.parse(existing?.itemData ?? "{}"); } catch { /* ignore */ }
    if (description !== undefined) parsed.description = description;
    if (quantity !== undefined) parsed.systemCount = quantity;
    mergedItemData = JSON.stringify(parsed);
  }

  const file = await db.file.update({
    where: { id: fileId },
    data: {
      ...(name !== undefined && { name }),
      ...(mergedItemData !== undefined && { itemData: mergedItemData }),
      ...(parentId !== undefined && { parentId: Number(parentId) }),
    },
  });

  // When quantity changes, upsert a systemCount equation component so the solver can reference it.
  if (quantity !== undefined) {
    const existing = await db.component.findFirst({
      where: { fileId, name: "systemCount", componentTypeId: 3, deletedAt: null },
      select: { id: true, order: true },
    });

    const content = JSON.stringify({
      _v2: true,
      raw: `systemCount = ${quantity ?? 0}`,
      result: quantity ?? 0,
      unit: "",
    });

    if (existing) {
      await db.component.update({
        where: { id: existing.id },
        data: { content },
      });
    } else {
      // Place it at order 0 (top of document)
      await db.component.create({
        data: {
          fileId,
          componentTypeId: 3,
          name: "systemCount",
          content,
          order: 0,
          itemid: crypto.randomUUID(),
          inEdit: 1,
        },
      });
    }
  }

  return NextResponse.json(fileToItem(file));
}

// DELETE /api/file/[id] — soft delete (requires admin permission)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { userId } = await getSessionUser();
  const fileId = Number(id);

  const canAdmin = await checkPermission(fileId, userId, "admin");
  if (!canAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.file.update({
    where: { id: fileId },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ deleted: true });
}
