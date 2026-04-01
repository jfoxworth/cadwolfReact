import { db } from "@/utils/db";

export interface AncestorItem {
  id:   number;
  slug: string;
  name: string;
  type: string; // raw file_type_id e.g. "Workspace", "Document", "Folder"
}

/**
 * Walk the parent chain from `fileId` up to the root, returning each ancestor
 * in top-down order (root first, the item itself last).
 *
 * Stops at depth 20 to guard against corrupt cycles.
 */
export async function resolveAncestors(fileId: number): Promise<AncestorItem[]> {
  const chain: AncestorItem[] = [];
  let currentId: number | null = fileId;
  const seen = new Set<number>();

  while (currentId !== null && !seen.has(currentId) && chain.length < 20) {
    seen.add(currentId);

    const file = await db.file.findUnique({
      where:  { id: currentId },
      select: { id: true, slug: true, name: true, fileTypeId: true, parentId: true },
    });

    if (!file) break;

    chain.unshift({
      id:   file.id,
      slug: file.slug,
      name: file.name,
      type: file.fileTypeId,
    });

    currentId = file.parentId ?? null;
  }

  return chain;
}
