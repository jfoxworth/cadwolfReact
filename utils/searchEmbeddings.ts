import { db } from "@/utils/db";
import { checkPermission } from "@/utils/checkPermission";
import { voyageEmbed } from "@/utils/voyageEmbed";

export interface SearchResult {
  fileId: number;
  fileName: string;
  chunkText: string;
  distance: number;
}

// Wider than the final result count — some candidates get dropped by the permission check
// below, so over-fetching keeps the final list close to `limit` rather than shrinking it.
const CANDIDATE_POOL_SIZE = 40;

// Caps how many chunks from a single file can occupy the final result set. Without this,
// one file with several near-duplicate chunks (or a near-duplicate file) can rank highly
// enough on every chunk to fill the entire `limit` by itself, crowding out other relevant
// documents that would otherwise have appeared further down the candidate pool.
const MAX_CHUNKS_PER_FILE = 3;

interface CandidateRow {
  file_id: number;
  file_name: string;
  chunk_text: string;
  distance: number;
}

/** Semantic search over every block the given user can actually view — not just documents
 *  they own. Permission-checked with the real checkPermission() (owner / viewPerm inheritance
 *  / explicit or team grants), not a re-derived SQL equivalent — see utils/checkPermission.ts.
 *  Candidates are fetched unscoped by permission and filtered in application code; this is
 *  slower than a single SQL query but keeps exactly one source of truth for who can view what. */
export async function searchDocuments(userId: number, query: string, limit = 8): Promise<SearchResult[]> {
  const { embeddings } = await voyageEmbed([query], "query");
  const queryVector = `[${embeddings[0].join(",")}]`;

  const candidates = await db.$queryRaw<CandidateRow[]>`
    SELECT be.file_id, f.name AS file_name, be.chunk_text, (be.embedding <=> ${queryVector}::vector) AS distance
    FROM "block_embeddings" be
    JOIN "files" f ON f.id = be.file_id
    WHERE f.deleted_at IS NULL
    ORDER BY be.embedding <=> ${queryVector}::vector
    LIMIT ${CANDIDATE_POOL_SIZE}
  `;

  const results: SearchResult[] = [];
  const perFileCount = new Map<number, number>();
  for (const c of candidates) {
    if (results.length >= limit) break;
    const fileCount = perFileCount.get(c.file_id) ?? 0;
    if (fileCount >= MAX_CHUNKS_PER_FILE) continue;
    if (await checkPermission(c.file_id, userId, "view")) {
      results.push({ fileId: c.file_id, fileName: c.file_name, chunkText: c.chunk_text, distance: c.distance });
      perFileCount.set(c.file_id, fileCount + 1);
    }
  }
  return results;
}
