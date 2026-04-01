import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/utils/db";
import { fileToItem } from "@/utils/transformers";
import { getSessionUser } from "@/utils/getSessionUser";
import { checkPermission } from "@/utils/checkPermission";

// POST /api/file/[id]/copy — duplicate a Document into the same parent folder
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { userId } = await getSessionUser();
  const fileId = Number(id);

  const source = await db.file.findUnique({
    where: { id: fileId },
    select: { id: true, fileTypeId: true, name: true, parentId: true, itemData: true, userId: true },
  });

  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (source.fileTypeId !== "Document") {
    return NextResponse.json({ error: "Only documents can be copied" }, { status: 400 });
  }

  const canView = await checkPermission(fileId, userId, "view");
  if (!canView) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Require edit permission on the parent to create a sibling
  if (source.parentId) {
    const canEdit = await checkPermission(source.parentId, userId, "edit");
    if (!canEdit) return NextResponse.json({ error: "No edit permission on parent folder" }, { status: 403 });
  }

  const siblingCount = await db.file.count({
    where: { parentId: source.parentId ?? null, deletedAt: null },
  });

  // Create the new file record
  const newFile = await db.file.create({
    data: {
      fileTypeId: source.fileTypeId,
      name:       `${source.name} (Copy)`,
      parentId:   source.parentId ?? null,
      userId,
      order:      siblingCount,
      slug:       nanoid(10),
      itemData:   source.itemData ?? "{}",
      lft:        0,
      rgt:        0,
    },
  });

  // Copy all non-deleted components to the new file
  const components = await db.component.findMany({
    where: { fileId, deletedAt: null },
    orderBy: { order: "asc" },
    select: { componentTypeId: true, content: true, order: true, name: true, inEdit: true },
  });

  if (components.length > 0) {
    await db.component.createMany({
      data: components.map((c) => ({
        fileId:          newFile.id,
        componentTypeId: c.componentTypeId,
        content:         c.content,
        order:           c.order,
        name:            c.name,
        inEdit:          c.inEdit,
        itemid:          crypto.randomUUID(),
      })),
    });
  }

  return NextResponse.json(fileToItem(newFile), { status: 201 });
}
