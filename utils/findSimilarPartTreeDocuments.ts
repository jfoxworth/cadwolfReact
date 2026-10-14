import { db } from "./db";
import { checkPermission } from "./checkPermission";
import { fetchDescendants } from "./fetchDescendants";
import { voyageEmbed } from "./voyageEmbed";

export interface DocumentMatch {
  fileId: number;
  fileName: string;
  distance: number;
}

interface CandidateRow {
  file_id: number;
  file_name: string;
  distance: number;
}

/** Content-based nearest-neighbor match for Build Mode's per-node template selection — replaces
 *  having the model guess a `templateFileId` from a name-only tree dump (utils/partTreeToText.ts
 *  never shows equation content, so a well-modeled but blandly-named document is otherwise
 *  unreachable). Scoped to one reference tree's own descendant Documents via `block_embeddings`,
 *  not a system-wide search like utils/searchEmbeddings.ts's searchDocuments(). */
export async function findSimilarPartTreeDocuments(
  userId: number,
  referenceTreeId: number,
  query: string,
  limit = 1,
): Promise<DocumentMatch[]> {
  const descendants = await fetchDescendants(referenceTreeId);
  const documentIds = descendants.filter((f) => f.fileTypeId === "Document").map((f) => f.id);
  if (documentIds.length === 0) return [];

  const { embeddings } = await voyageEmbed([query], "query");
  const queryVector = `[${embeddings[0].join(",")}]`;

  const candidates = await db.$queryRaw<CandidateRow[]>`
    SELECT be.file_id, f.name AS file_name, (be.embedding <=> ${queryVector}::vector) AS distance
    FROM "block_embeddings" be
    JOIN "files" f ON f.id = be.file_id
    WHERE f.deleted_at IS NULL AND be.file_id = ANY(${documentIds})
    ORDER BY be.embedding <=> ${queryVector}::vector
    LIMIT 200
  `;

  const results: DocumentMatch[] = [];
  const seenFiles = new Set<number>();
  for (const c of candidates) {
    if (results.length >= limit) break;
    if (seenFiles.has(c.file_id)) continue;
    if (await checkPermission(c.file_id, userId, "view")) {
      results.push({ fileId: c.file_id, fileName: c.file_name, distance: c.distance });
      seenFiles.add(c.file_id);
    }
  }
  return results;
}
