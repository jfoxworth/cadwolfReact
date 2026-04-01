import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/utils/db";
import { fileToItem } from "@/utils/transformers";
import { initRootWorkspacePermissions, checkPermission } from "@/utils/checkPermission";
import { getSessionUser } from "@/utils/getSessionUser";

// POST /api/file — create a new file (workspace, document, folder, part tree)
export async function POST(req: NextRequest) {
  const { userId } = await getSessionUser();
  const body = await req.json();
  const { fileTypeId, name, parentId } = body;

  // For non-root files, require edit permission on the parent
  if (parentId) {
    const canEdit = await checkPermission(Number(parentId), userId, "edit");
    if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const siblingCount = await db.file.count({
    where: { parentId: parentId ?? null, deletedAt: null },
  });

  const file = await db.file.create({
    data: {
      fileTypeId,
      name,
      parentId: parentId ?? null,
      userId,
      order: siblingCount,
      slug: nanoid(10),
      itemData: "{}",
      lft: 0,
      rgt: 0,
    },
  });

  // Root workspaces get default permissions: view=everyone, edit/admin=list (owner only)
  if (fileTypeId === "Workspace" && !parentId) {
    await initRootWorkspacePermissions(file.id, userId);
  }

  return NextResponse.json(fileToItem(file), { status: 201 });
}
