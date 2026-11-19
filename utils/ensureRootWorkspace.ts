import { nanoid } from "nanoid";
import { db } from "@/utils/db";
import { initRootWorkspacePermissions } from "@/utils/checkPermission";

/** Gives a user their root Workspace if they have none, and returns its id. Safe to call more
 *  than once: if a root workspace exists it is returned unchanged. The workspace takes the same
 *  shape as one created through POST /api/file, with the default permissions (anyone can view,
 *  only the owner can edit and administer). */
export async function ensureRootWorkspace(userId: number, username: string): Promise<number> {
  const existing = await db.file.findFirst({
    where: { userId, parentId: null, deletedAt: null, fileTypeId: "Workspace" },
    orderBy: { id: "asc" },
    select: { id: true },
  });
  if (existing) return existing.id;

  const file = await db.file.create({
    data: {
      fileTypeId: "Workspace",
      name: username,
      parentId: null,
      userId,
      order: 0,
      slug: nanoid(10),
      itemData: "{}",
      lft: 0,
      rgt: 0,
    },
  });
  await initRootWorkspacePermissions(file.id, userId);
  return file.id;
}
