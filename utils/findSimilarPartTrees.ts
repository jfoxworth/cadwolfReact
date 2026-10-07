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

export interface SimilarPartTreeCandidate {
  fileId: number;
  name: string;
  distance: number;
}

export interface FindSimilarPartTreesResult {
  text: string;
  candidates: SimilarPartTreeCandidate[];
}

/** Semantic search over precomputed part-tree structural embeddings (utils/embedPartTree.ts) —
 *  backs the AI chat's `find_similar_part_trees` tool, the part-tree analog of
 *  utils/searchEmbeddings.ts::searchDocuments. Permission-checked per candidate (not a re-derived
 *  SQL equivalent), same reasoning as that file. Returns both the prose fed back to the model as
 *  the tool_result and the same candidates structured, so the route can also emit them to the
 *  client as a dedicated event without a second query. `excludeFileId` (the part tree the user
 *  is currently on, if any) is filtered out server-side — without it, the current tree is
 *  nearly always its own closest embedding match and would otherwise show up as a "similar"
 *  candidate to itself. -1 (no real file has this id) is used as a no-op when there's nothing
 *  to exclude, since $queryRaw's template tag doesn't support conditionally omitting a clause. */
export async function findSimilarPartTreesForChat(
  userId: number, description: string, excludeFileId?: number | null,
): Promise<FindSimilarPartTreesResult> {
  const { embeddings } = await voyageEmbed([description], "query");
  const queryVector = `[${embeddings[0].join(",")}]`;
  const excludeId = excludeFileId ?? -1;

  const rows = await db.$queryRaw<CandidateRow[]>`
    SELECT f.id AS file_id, f.name, (pte.embedding <=> ${queryVector}::vector) AS distance
    FROM "part_tree_embeddings" pte
    JOIN "files" f ON f.id = pte.file_id
    WHERE f.deleted_at IS NULL AND f.id != ${excludeId}
    ORDER BY pte.embedding <=> ${queryVector}::vector
    LIMIT ${CANDIDATE_POOL_SIZE}
  `;

  const candidates: SimilarPartTreeCandidate[] = [];
  for (const row of rows) {
    if (candidates.length >= MAX_RESULTS) break;
    if (!(await checkPermission(row.file_id, userId, "view"))) continue;
    candidates.push({ fileId: row.file_id, name: row.name, distance: row.distance });
  }

  const text = candidates.length
    ? candidates
        .map((c) => `Part Tree: "${c.name}" (id ${c.fileId}, similarity distance ${c.distance.toFixed(3)} — lower is closer)`)
        .join("\n")
    : "No similar part trees found.";

  return { text, candidates };
}
