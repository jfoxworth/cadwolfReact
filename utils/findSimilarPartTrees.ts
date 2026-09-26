import { db } from "./db";
import { checkPermission } from "./checkPermission";
import { voyageEmbed } from "./voyageEmbed";

// Wider than the final result count — some candidates get dropped by the permission check
// below, same over-fetch-then-filter reasoning as utils/searchEmbeddings.ts::searchDocuments.
const CANDIDATE_POOL_SIZE = 20;
const MAX_RESULTS = 8;

interface CandidateRow {
  file_id: number;
  name: string;
  distance: number;
}

/** Semantic search over precomputed part-tree structural embeddings (utils/embedPartTree.ts) —
 *  backs the AI chat's `find_similar_part_trees` tool, the part-tree analog of
 *  utils/searchEmbeddings.ts::searchDocuments. Permission-checked per candidate (not a re-derived
 *  SQL equivalent), same reasoning as that file. */
export async function findSimilarPartTreesForChat(userId: number, description: string): Promise<string> {
  const { embeddings } = await voyageEmbed([description], "query");
  const queryVector = `[${embeddings[0].join(",")}]`;

  const candidates = await db.$queryRaw<CandidateRow[]>`
    SELECT f.id AS file_id, f.name, (pte.embedding <=> ${queryVector}::vector) AS distance
    FROM "part_tree_embeddings" pte
    JOIN "files" f ON f.id = pte.file_id
    WHERE f.deleted_at IS NULL
    ORDER BY pte.embedding <=> ${queryVector}::vector
    LIMIT ${CANDIDATE_POOL_SIZE}
  `;

  const results: string[] = [];
  for (const c of candidates) {
    if (results.length >= MAX_RESULTS) break;
    if (!(await checkPermission(c.file_id, userId, "view"))) continue;
    results.push(`Part Tree: "${c.name}" (id ${c.file_id}, similarity distance ${c.distance.toFixed(3)} — lower is closer)`);
  }

  return results.length ? results.join("\n") : "No similar part trees found.";
}
