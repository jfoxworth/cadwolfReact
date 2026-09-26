import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { fileToItem } from "@/utils/transformers";
import { getSessionUser } from "@/utils/getSessionUser";
import { checkPermission } from "@/utils/checkPermission";
import { decrementStorageUsed } from "@/utils/storage";
import { resolveAncestors } from "@/utils/resolveAncestors";
import { embedPartTree } from "@/utils/embedPartTree";

const PART_TREE_FILE_TYPES = new Set(["PartTree", "Part Tree"]);

/** Which part tree (if any) `fileId` currently lives under, or is itself. Reflects whatever the
 *  DB says at the moment it's called — callers use this both before and after a mutation that
 *  might change `parentId`, to catch both the old and new enclosing tree on a move. */
async function findEnclosingPartTreeId(fileId: number): Promise<number | null> {
  const chain = await resolveAncestors(fileId);
  return chain.find((a) => PART_TREE_FILE_TYPES.has(a.type))?.id ?? null;
}

/** Fire-and-forget refresh for each given part tree id — part trees have no separate "Save"
 *  step, so every structural mutation already is one. Never awaited, same convention as
 *  embedComponent's own call sites (app/api/component/route.ts), so this never delays the
 *  actual response. */
function refreshPartTreeEmbeddings(ids: (number | null)[]): void {
  for (const id of new Set(ids.filter((id): id is number => id !== null))) {
    embedPartTree(db, id).catch((err) => console.error("Failed to refresh part tree embedding:", err));
  }
}

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

  // Captured before the update so a move (parentId change) can be detected — compared against
  // the same lookup run again after the update below.
  const oldPartTreeId = await findEnclosingPartTreeId(fileId);

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

  const newPartTreeId = parentId !== undefined ? await findEnclosingPartTreeId(fileId) : oldPartTreeId;
  refreshPartTreeEmbeddings([oldPartTreeId, newPartTreeId]);

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

  // Resolved before deleting — deleting the part tree root itself needs no refresh (nothing
  // left to search for), only deleting something *inside* one does.
  const enclosingPartTreeId = await findEnclosingPartTreeId(fileId);

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

  if (enclosingPartTreeId !== null && enclosingPartTreeId !== fileId) {
    refreshPartTreeEmbeddings([enclosingPartTreeId]);
  }

  return NextResponse.json({ deleted: true });
}
