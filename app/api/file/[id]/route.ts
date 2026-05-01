import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { fileToItem } from "@/utils/transformers";
import { getSessionUser } from "@/utils/getSessionUser";
import { checkPermission } from "@/utils/checkPermission";
import { decrementStorageUsed } from "@/utils/storage";

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
  const { name, itemData, description, quantity, isAnalysis, parentId, needsUpdate, clearImportNeedsUpdate } = body;

  // Moving to a new parent requires edit permission on the target
  if (parentId !== undefined) {
    const canEditTarget = await checkPermission(Number(parentId), userId, "edit");
    if (!canEditTarget) return NextResponse.json({ error: "No edit permission on destination" }, { status: 403 });
  }

  // Merge patch fields (description, quantity, isAnalysis) into the existing itemData JSON
  let mergedItemData = itemData;
  if ((description !== undefined || quantity !== undefined || isAnalysis !== undefined) && mergedItemData === undefined) {
    const existing = await db.file.findUnique({ where: { id: fileId }, select: { itemData: true } });
    let parsed: Record<string, unknown> = {};
    try { parsed = JSON.parse(existing?.itemData ?? "{}"); } catch { /* ignore */ }
    if (description !== undefined) parsed.description = description;
    if (quantity !== undefined) parsed.systemCount = quantity;
    if (isAnalysis !== undefined) parsed.isAnalysis = isAnalysis;
    mergedItemData = JSON.stringify(parsed);
  }

  const file = await db.file.update({
    where: { id: fileId },
    data: {
      ...(name !== undefined && { name }),
      ...(mergedItemData !== undefined && { itemData: mergedItemData }),
      ...(parentId !== undefined && { parentId: Number(parentId) }),
      ...(needsUpdate !== undefined && { needsUpdate }),
    },
  });

  // When resolving a document, also clear stale flags on its imports.
  if (clearImportNeedsUpdate) {
    await db.fileImport.updateMany({ where: { fileId }, data: { needsUpdate: false } });
  }

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

  const file = await db.file.findUnique({
    where: { id: fileId },
    select: { fileTypeId: true, storageBytes: true, userId: true },
  });

  // Collect all descendants for cascade soft-deletion
  const descendantIds: number[] = [];
  let queue = [fileId];
  while (queue.length) {
    const children = await db.file.findMany({
      where: { parentId: { in: queue }, deletedAt: null },
      select: { id: true },
    });
    const childIds = children.map((c) => c.id);
    descendantIds.push(...childIds);
    queue = childIds;
  }

  // Soft-delete the target file and all descendants in one batch
  await db.file.updateMany({
    where: { id: { in: [fileId, ...descendantIds] } },
    data: { deletedAt: new Date() },
  });

  // Decrement storage for the root file if it's an Image
  if (file?.fileTypeId === "Image" && file.storageBytes > 0n) {
    await decrementStorageUsed(file.userId, Number(file.storageBytes));
  }

  // Decrement storage for any Image descendants
  if (descendantIds.length > 0) {
    const imageDescendants = await db.file.findMany({
      where: { id: { in: descendantIds }, fileTypeId: "Image" },
      select: { userId: true, storageBytes: true },
    });
    for (const img of imageDescendants) {
      if (img.storageBytes > 0n) {
        await decrementStorageUsed(img.userId, Number(img.storageBytes));
      }
    }
  }

  return NextResponse.json({ deleted: true });
}
