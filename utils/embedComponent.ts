import type { PrismaClient, Component } from "@prisma/client";
import { componentToBlock } from "./transformers";
import { blockToContextLine, chunkTextBlock } from "./blockToText";
import { voyageEmbed, VOYAGE_MODEL } from "./voyageEmbed";

/** (Re-)computes and stores every embedding chunk for one Component — used by both the
 *  keep-current save hooks (app/api/component routes) and the one-time backfill script, so
 *  there's a single place that decides how a block turns into embedding rows. Always clears
 *  any existing chunks for this component first: simplest correct way to handle a block whose
 *  chunk count changed (e.g. a TEXT block edited from short to long, or vice versa) without
 *  reasoning about stale leftover rows. A block with no real content (blockToContextLine
 *  returns null — currently just LINE_BREAK) ends up with zero rows, which is correct, not
 *  an error. Never throws for "nothing to embed" — only for an actual Voyage/DB failure,
 *  which callers should treat as non-fatal to whatever save triggered it. */
export async function embedComponent(db: PrismaClient, component: Component): Promise<void> {
  await db.blockEmbedding.deleteMany({ where: { componentId: component.id } });

  const block = componentToBlock(component);
  const line = blockToContextLine(block);
  if (!line) return;

  const chunks = block.type === "TEXT" ? chunkTextBlock(line) : [line];
  const { embeddings } = await voyageEmbed(chunks, "document");

  for (let i = 0; i < chunks.length; i++) {
    const vectorLiteral = `[${embeddings[i].join(",")}]`;
    await db.$executeRaw`
      INSERT INTO "block_embeddings"
        ("component_id", "file_id", "chunk_index", "chunk_text", "embedding", "provider", "model", "updated_at")
      VALUES
        (${component.id}, ${component.fileId}, ${i}, ${chunks[i]}, ${vectorLiteral}::vector, 'voyage', ${VOYAGE_MODEL}, now())
    `;
  }
}

export async function deleteComponentEmbeddings(db: PrismaClient, componentId: number): Promise<void> {
  await db.blockEmbedding.deleteMany({ where: { componentId } });
}

/** Batched version of embedComponent for bulk work (the backfill script) — calling Voyage
 *  once per component doesn't scale to a database with tens of thousands of them (each call
 *  is a real network round-trip). Flattens every component's chunk text into one list and
 *  embeds it in sub-batches of up to Voyage's 1000-texts-per-request limit, instead of one
 *  request per component. The live save hooks (app/api/component routes) still use the
 *  single-component embedComponent above — saves already happen one at a time, so there's
 *  nothing to batch there. */
export async function embedComponentsBatch(
  db: PrismaClient,
  components: Component[],
): Promise<{ succeededIds: number[]; failed: { componentId: number; error: string }[] }> {
  if (components.length === 0) return { succeededIds: [], failed: [] };

  await db.blockEmbedding.deleteMany({ where: { componentId: { in: components.map((c) => c.id) } } });

  const flat: { component: Component; chunkIndex: number; text: string }[] = [];
  for (const component of components) {
    const block = componentToBlock(component);
    const line = blockToContextLine(block);
    if (!line) continue; // nothing to embed (e.g. LINE_BREAK) — not a failure
    const chunks = block.type === "TEXT" ? chunkTextBlock(line) : [line];
    chunks.forEach((text, chunkIndex) => flat.push({ component, chunkIndex, text }));
  }

  const succeededIds = new Set<number>();
  const failed: { componentId: number; error: string }[] = [];
  const VOYAGE_MAX_INPUTS = 1000;

  for (let i = 0; i < flat.length; i += VOYAGE_MAX_INPUTS) {
    const slice = flat.slice(i, i + VOYAGE_MAX_INPUTS);
    try {
      const { embeddings } = await voyageEmbed(slice.map((s) => s.text), "document");
      for (let j = 0; j < slice.length; j++) {
        const { component, chunkIndex, text } = slice[j];
        const vectorLiteral = `[${embeddings[j].join(",")}]`;
        await db.$executeRaw`
          INSERT INTO "block_embeddings"
            ("component_id", "file_id", "chunk_index", "chunk_text", "embedding", "provider", "model", "updated_at")
          VALUES
            (${component.id}, ${component.fileId}, ${chunkIndex}, ${text}, ${vectorLiteral}::vector, 'voyage', ${VOYAGE_MODEL}, now())
        `;
        succeededIds.add(component.id);
      }
    } catch (err) {
      // A 429 (rate limit) is retryable — let it propagate so a caller doing bulk work (the
      // backfill script) can back off and retry the same batch, rather than recording it as a
      // permanent failure. Any other error (a bad chunk, a DB issue) isn't retryable the same
      // way, so it's recorded against every component that contributed a chunk to this slice
      // rather than guessing which specific one caused it.
      if (err instanceof Error && err.message.includes("429")) throw err;
      const message = err instanceof Error ? err.message : String(err);
      for (const { component } of slice) failed.push({ componentId: component.id, error: message });
    }
  }

  return { succeededIds: [...succeededIds], failed };
}
