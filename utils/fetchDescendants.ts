import type { File } from "@prisma/client";
import { db } from "./db";

/** BFS-walks every descendant of `rootId` via `parentId`, level by level. Extracted from
 *  app/(app)/part-tree/[...slug]/page.tsx so server-only tool/embedding code (utils/readPartTree.ts,
 *  utils/embedPartTree.ts) can reuse the same walk without duplicating it. */
export async function fetchDescendants(rootId: number): Promise<File[]> {
  const all: File[] = [];
  let queue = [rootId];
  while (queue.length) {
    const children = await db.file.findMany({
      where: { parentId: { in: queue }, deletedAt: null },
      orderBy: { order: "asc" },
    });
    all.push(...children);
    queue = children.map((c) => c.id);
  }
  return all;
}
