import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";
import { checkPermission } from "@/utils/checkPermission";

// POST /api/file/[id]/snapshot — create a point-in-time snapshot of a PART_TREE and all descendants
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { userId } = await getSessionUser();
  const partTreeId = Number(id);

  const canEdit = await checkPermission(partTreeId, userId, "edit");
  if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const root = await db.file.findUnique({
    where: { id: partTreeId },
    select: { id: true, fileTypeId: true, version: true },
  });
  if (!root) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!["PartTree", "Part Tree"].includes(root.fileTypeId)) {
    return NextResponse.json({ error: "Snapshot is only available for Part Trees" }, { status: 400 });
  }

  // Collect all descendant files recursively using parentId
  const allDescendants: number[] = [];
  const queue = [partTreeId];
  while (queue.length > 0) {
    const parentId = queue.shift()!;
    const children = await db.file.findMany({
      where: { parentId, deletedAt: null },
      select: { id: true },
    });
    for (const child of children) {
      allDescendants.push(child.id);
      queue.push(child.id);
    }
  }

  const newVersion = (root.version ?? 1) + 1;
  const snapshotVersion = root.version ?? 1;

  // Build all snapshot records in a single transaction
  await db.$transaction(async (tx) => {
    // Snapshot each descendant's current components
    for (const fileId of allDescendants) {
      const components = await tx.component.findMany({
        where: { fileId, deletedAt: null },
        select: { id: true, itemid: true, componentTypeId: true, content: true, order: true, name: true },
        orderBy: { order: "asc" },
      });
      if (components.length > 0) {
        await tx.fileVersion.create({
          data: {
            fileId,
            partTreeId,
            version: snapshotVersion,
            snapshotData: JSON.stringify(components),
            createdBy: userId,
          },
        });
      }
    }
    // Bump the part tree's version counter
    await tx.file.update({
      where: { id: partTreeId },
      data: { version: newVersion },
    });
  });

  return NextResponse.json({ version: newVersion, descendantsSnapshotted: allDescendants.length });
}
