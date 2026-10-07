import { db } from "./db";
import { componentToBlock } from "./transformers";
import type { Block } from "@/types/document";

/** Full-fidelity block reader for one document — unlike utils/readDocument.ts's
 *  readDocumentForChat (which collapses every block to a lossy one-line summary via
 *  blockToContextLine, for the chat model), this returns each block's real `definition`
 *  (raw equation strings, full text/expression content) so it can be used as a literal
 *  template to adapt from. Callers are responsible for their own permission check before
 *  calling this — it does no access control itself (see app/api/part-tree/generate-document). */
export async function getDocumentFullBlocks(fileId: number): Promise<{ name: string; blocks: Block[] } | null> {
  const file = await db.file.findUnique({ where: { id: fileId }, select: { name: true } });
  if (!file) return null;

  const components = await db.component.findMany({ where: { fileId }, orderBy: { order: "asc" } });
  return { name: file.name, blocks: components.map(componentToBlock) };
}
