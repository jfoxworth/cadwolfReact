import { db } from "./db";
import { fileToItem } from "./transformers";
import { fetchDescendants } from "./fetchDescendants";
import type { ImportEdge } from "./partTreeToText";
import type { Item } from "@/types/item";
import type { File } from "@prisma/client";

export interface PartTreeGraphData {
  root: File;
  rootItem: Item;
  items: Item[];
  childrenMap: Map<string, Item[]>;
  importsByItemId: Map<string, ImportEdge[]>;
}

/** Fetches and shapes one part tree's full data (descendants, parent/child map, and
 *  cross-document import edges) — the shared assembly step behind both utils/readPartTree.ts
 *  (renders it as text for the AI) and utils/embedPartTree.ts (embeds it). Returns null if the
 *  id doesn't exist or isn't a part tree — callers decide how to report that (permission checks
 *  are the caller's responsibility too, since the two callers need different failure messages). */
export async function buildPartTreeGraphData(rootId: number): Promise<PartTreeGraphData | null> {
  const root = await db.file.findUnique({ where: { id: rootId } });
  if (!root || !["PartTree", "Part Tree"].includes(root.fileTypeId)) return null;

  const descendants = await fetchDescendants(rootId);
  const items = descendants.map(fileToItem);
  const rootItem = fileToItem(root);

  const childrenMap = new Map<string, Item[]>();
  childrenMap.set(rootItem.id, []);
  for (const item of items) {
    const pid = item.parentId ?? rootItem.id;
    if (!childrenMap.has(pid)) childrenMap.set(pid, []);
    childrenMap.get(pid)!.push(item);
  }

  const allIds = [root.id, ...descendants.map((d) => d.id)];
  const importRows = await db.fileImport.findMany({ where: { fileId: { in: allIds } } });
  const importsByItemId = new Map<string, ImportEdge[]>();
  for (const row of importRows) {
    const key = String(row.fileId);
    if (!importsByItemId.has(key)) importsByItemId.set(key, []);
    importsByItemId.get(key)!.push({
      localAlias: row.localAlias,
      sourceVariableName: row.sourceVariableName,
      sourceFileName: row.sourceFileName,
      sourceFileId: row.sourceFileId,
    });
  }

  return { root, rootItem, items, childrenMap, importsByItemId };
}
