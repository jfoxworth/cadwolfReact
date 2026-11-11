// Creates the systems (folders) and parts a coordinator decided on, directly beneath its own
// location. Mirrors what POST /api/file does for a non-root item, written straight through
// Prisma so an agent doesn't need an HTTP round trip. Items that already exist are kept, never
// duplicated or replaced, so re-running a build fills in around what is there. An existing item
// keeps its own kind: if the user already made "Upper Tunnel" a system, it stays a system even
// when the model called it a part.
import { nanoid } from "nanoid";
import { db } from "@/utils/db";
import { isDesignDocument } from "./designDocument";

export type TreeItemKind = "system" | "part";

/** How each kind is stored: a system is a "Workspace" file nested in the tree, a part is an
 *  ordinary "Document" (requirements documents are Documents flagged isAnalysis, so they are
 *  never mistaken for parts). */
const FILE_TYPE_BY_KIND: Record<TreeItemKind, string> = {
  system: "Workspace",
  part: "Document",
};

function isPlainPart(itemData: string | null): boolean {
  if (isDesignDocument(itemData)) return false;
  try {
    const parsed: unknown = JSON.parse(itemData || "{}");
    return !(typeof parsed === "object" && parsed !== null && (parsed as { isAnalysis?: unknown }).isAnalysis === true);
  } catch {
    return true;
  }
}

export async function createTreeItem(args: {
  userId: number;
  parentId: number;
  kind: TreeItemKind;
  name: string;
}): Promise<{ fileId: number; created: boolean; kind: TreeItemKind }> {
  const { userId, parentId, kind } = args;
  const name = args.name.trim();
  const fileTypeId = FILE_TYPE_BY_KIND[kind];

  const siblings = await db.file.findMany({
    where: { parentId, deletedAt: null },
    select: { id: true, name: true, fileTypeId: true, itemData: true },
  });

  // Same name, any kind. Requirements and design documents are never the item itself.
  const existing = siblings.find(
    (s) =>
      s.name.trim().toLowerCase() === name.toLowerCase() &&
      (s.fileTypeId === FILE_TYPE_BY_KIND.system || (s.fileTypeId === FILE_TYPE_BY_KIND.part && isPlainPart(s.itemData))),
  );
  if (existing) {
    return {
      fileId: existing.id,
      created: false,
      kind: existing.fileTypeId === FILE_TYPE_BY_KIND.system ? "system" : "part",
    };
  }

  const now = new Date();
  const file = await db.file.create({
    data: {
      fileTypeId,
      name,
      parentId,
      userId,
      order: siblings.length,
      slug: nanoid(10),
      itemData: "{}",
      lft: 0,
      rgt: 0,
      // Set explicitly: the columns have no database default, and a NULL date is shown to
      // the user as "now".
      createdAt: now,
      updatedAt: now,
    },
  });
  return { fileId: file.id, created: true, kind };
}
