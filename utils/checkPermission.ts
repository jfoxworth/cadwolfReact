import { db } from "@/utils/db";

export type PermLevel = "view" | "edit" | "admin";
export type PermMode = "everyone" | "inherit" | "list";

// Level hierarchy — having a higher level implies lower levels
const LEVEL_RANK: Record<PermLevel, number> = { view: 1, edit: 2, admin: 3 };

/**
 * Returns true if userId has at least `level` access to the file with fileId.
 * Walks up the parent chain for inherited permissions.
 * Owners always have admin access.
 */
export async function checkPermission(
  fileId: number,
  userId: number,
  level: PermLevel,
): Promise<boolean> {
  return _check(fileId, userId, level, new Set());
}

async function _check(
  fileId: number,
  userId: number,
  level: PermLevel,
  visited: Set<number>,
): Promise<boolean> {
  if (visited.has(fileId)) return false;
  visited.add(fileId);

  const file = await db.file.findUnique({
    where: { id: fileId },
    select: { userId: true, parentId: true, itemData: true },
  });
  if (!file) return false;

  // Owner always has full access
  if (file.userId === userId) return true;

  let itemData: Record<string, unknown> = {};
  try { itemData = JSON.parse(file.itemData ?? "{}"); } catch { /* ignore */ }

  const modeKey = level === "view" ? "viewPerm" : level === "edit" ? "editPerm" : "adminPerm";
  const mode = (itemData[modeKey] as PermMode | undefined) ?? "inherit";

  if (mode === "everyone" && level === "view") return true;

  if (mode === "list") {
    return _hasExplicitGrant(fileId, userId, level);
  }

  // "inherit" or absent — walk up
  if (file.parentId == null) return false;
  return _check(file.parentId, userId, level, visited);
}

async function _hasExplicitGrant(
  fileId: number,
  userId: number,
  level: PermLevel,
): Promise<boolean> {
  const requiredRank = LEVEL_RANK[level];

  // Get teams the user belongs to
  const memberships = await db.teamMember.findMany({
    where: { userId },
    select: { teamId: true },
  });
  const teamIds = memberships.map((m) => m.teamId);

  // Check for a permission record that grants at least the required level
  const match = await db.filePermission.findFirst({
    where: {
      fileId,
      OR: [
        { subjectType: "user", subjectId: userId },
        ...(teamIds.length > 0 ? [{ subjectType: "team", subjectId: { in: teamIds } }] : []),
      ],
    },
    select: { level: true },
  });

  if (!match) return false;
  return LEVEL_RANK[match.level as PermLevel] >= requiredRank;
}

/**
 * Helper: set default permissions for a new root workspace.
 * viewPerm = "everyone", editPerm = "list", adminPerm = "list"
 * + inserts an admin grant for the owner.
 */
export async function initRootWorkspacePermissions(
  fileId: number,
  ownerId: number,
): Promise<void> {
  const file = await db.file.findUnique({ where: { id: fileId }, select: { itemData: true } });
  let parsed: Record<string, unknown> = {};
  try { parsed = JSON.parse(file?.itemData ?? "{}"); } catch { /* ignore */ }
  parsed.viewPerm = "everyone";
  parsed.editPerm = "list";
  parsed.adminPerm = "list";

  await Promise.all([
    db.file.update({ where: { id: fileId }, data: { itemData: JSON.stringify(parsed) } }),
    db.filePermission.create({
      data: { fileId, subjectId: ownerId, subjectType: "user", level: "admin" },
    }),
  ]);
}
