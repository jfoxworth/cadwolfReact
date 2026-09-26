import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/utils/db";
import { fileToItem } from "@/utils/transformers";
import { initRootWorkspacePermissions, checkPermission } from "@/utils/checkPermission";
import { getSessionUser } from "@/utils/getSessionUser";
import { resolveAncestors } from "@/utils/resolveAncestors";
import { embedPartTree } from "@/utils/embedPartTree";

const PART_TREE_FILE_TYPES = new Set(["PartTree", "Part Tree"]);

/** Fire-and-forget: if `parentId` sits inside a part tree, refresh that tree's structural
 *  embedding (utils/embedPartTree.ts) — part trees have no separate "Save" step, so every
 *  structural mutation already is one. Never awaited, same convention as embedComponent's own
 *  call sites (app/api/component/route.ts), so this never delays the actual response. */
function refreshEnclosingPartTreeEmbedding(parentId: number | null | undefined): void {
  if (!parentId) return;
  resolveAncestors(parentId)
    .then((chain) => {
      const partTree = chain.find((a) => PART_TREE_FILE_TYPES.has(a.type));
      if (partTree) return embedPartTree(db, partTree.id);
    })
    .catch((err) => console.error("Failed to refresh part tree embedding:", err));
}

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

  refreshEnclosingPartTreeEmbedding(parentId ? Number(parentId) : null);

  return NextResponse.json(fileToItem(file), { status: 201 });
}
