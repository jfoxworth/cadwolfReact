import type { PrismaClient } from "@prisma/client";
import { buildPartTreeGraphData } from "./partTreeGraph";
import { buildPartTreePageContext } from "./partTreeToText";
import { voyageEmbed, VOYAGE_MODEL } from "./voyageEmbed";

/** (Re-)computes and stores the structural-similarity embedding for one part tree — called
 *  fire-and-forget (not awaited) from the file mutation routes whenever something inside a part
 *  tree changes, the same convention utils/embedComponent.ts already uses for document content
 *  (see app/api/component/route.ts: `embedComponent(db, component).catch(...)`, never awaited).
 *  Part trees have no separate "Save" step — every create/rename/move/delete/quantity/analysis/
 *  description change already IS a save for this page, so those mutation routes are the hook
 *  point. Silently no-ops if the id isn't a part tree (defensive — callers should already only
 *  call this with a resolved part-tree id, via utils/resolveAncestors.ts). */
export async function embedPartTree(db: PrismaClient, partTreeId: number): Promise<void> {
  const graph = await buildPartTreeGraphData(partTreeId);
  if (!graph) return;

  // Full structure INCLUDING import wiring — this is the "graph structure" half of what gets
  // compared against a proposed new system; the user's own written description is the other half.
  const structure = buildPartTreePageContext(
    graph.rootItem, graph.childrenMap, new Map(), new Map(), "", "", graph.importsByItemId,
  ).text;
  const summaryText = [
    `Part Tree: ${graph.rootItem.name}`,
    graph.rootItem.description ? `Description: ${graph.rootItem.description}` : null,
    "",
    structure,
  ].filter(Boolean).join("\n");

  const { embeddings } = await voyageEmbed([summaryText], "document");
  const vectorLiteral = `[${embeddings[0].join(",")}]`;
  await db.$executeRaw`
    INSERT INTO "part_tree_embeddings" ("file_id", "summary_text", "embedding", "provider", "model", "updated_at")
    VALUES (${partTreeId}, ${summaryText}, ${vectorLiteral}::vector, 'voyage', ${VOYAGE_MODEL}, now())
    ON CONFLICT ("file_id") DO UPDATE SET
      "summary_text" = EXCLUDED."summary_text",
      "embedding" = EXCLUDED."embedding",
      "updated_at" = now()
  `;
}
