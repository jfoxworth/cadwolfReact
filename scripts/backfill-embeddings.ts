import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { embedComponentsBatch } from "../utils/embedComponent";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
});
const db = new PrismaClient({ adapter });

// This Voyage account has no payment method on file yet, which caps it at 3 requests/minute
// and 10K tokens/minute (the 200M free-token allowance still applies once a card is added —
// this is a rate limit, not a cost issue). Rather than requiring that setup step, pace the
// script to stay under those limits.
//
// PAGE_SIZE was originally 150, on the (wrong) assumption that spacing requests apart was
// the only thing that mattered. Measured against this database's actual content, a 150-page
// averages ~311 chars (~78 estimated tokens) per chunk-text — ~11,700 estimated tokens for
// the page, already over the 10K/minute cap on its own, before any timing comes into play at
// all. That's why every attempt failed instantly regardless of the gap between retries: a
// single over-limit request can't be fixed by waiting longer. 60 components/page keeps a
// typical page closer to ~4,700 estimated tokens — real margin under the cap, not just under
// on average (individual blocks vary — a long TEXT chunk can run well past this page's mean).
const PAGE_SIZE = 60;
const MIN_REQUEST_GAP_MS = 21_000; // >20s → strictly under 3/minute, with a small safety margin
const RATE_LIMIT_RETRY_WAIT_MS = 65_000; // a bit over a full minute window
const MAX_RATE_LIMIT_RETRIES = 5;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitError(err: unknown): boolean {
  return err instanceof Error && err.message.includes("429");
}

let lastRequestAt = 0;
async function waitForRateLimit(): Promise<void> {
  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < MIN_REQUEST_GAP_MS) await sleep(MIN_REQUEST_GAP_MS - elapsed);
  lastRequestAt = Date.now();
}

// One-time (resumable) backfill: embed every Document's existing blocks. Safe to re-run —
// skips any component that already has an up-to-date embedding for the current model, so an
// interrupted run just picks back up. Documents only, matching what's actually been built so
// far (Datasets/other file types are out of scope for this phase).
//
// Pages through components (cursor-based, ordered by id) instead of one unbounded findMany —
// at ~32k matching components in this database, fetching every row's full `content` in a
// single query took long enough with zero output that it looked hung rather than just slow;
// paginating gives real incremental progress and avoids holding that much in memory at once.
// Each page is embedded as one batch (see embedComponentsBatch) rather than one Voyage call
// per component — at this scale, one-call-per-component would mean tens of thousands of
// network round-trips.
async function main() {
  console.log("Loading already-embedded component ids...");
  const existing = await db.blockEmbedding.findMany({
    where: { model: "voyage-4-lite" },
    select: { componentId: true },
    distinct: ["componentId"],
  });
  const upToDate = new Set(existing.map((e) => e.componentId));
  console.log(`${upToDate.size} components already up to date.`);

  let done = 0;
  let failed = 0;
  let skipped = 0;
  let cursor: number | undefined;

  for (;;) {
    const page = await db.component.findMany({
      where: {
        deletedAt: null,
        file: { fileTypeId: "Document", deletedAt: null },
      },
      orderBy: { id: "asc" },
      take: PAGE_SIZE,
      ...(cursor !== undefined && { skip: 1, cursor: { id: cursor } }),
    });
    if (page.length === 0) break;
    cursor = page[page.length - 1].id;

    const pending = page.filter((c) => !upToDate.has(c.id));
    skipped += page.length - pending.length;

    if (pending.length > 0) {
      let attempt = 0;
      for (;;) {
        await waitForRateLimit();
        try {
          const { succeededIds, failed: failures } = await embedComponentsBatch(db, pending);
          done += succeededIds.length;
          failed += failures.length;
          for (const f of failures) console.error(`Failed to embed component ${f.componentId}: ${f.error}`);
          break;
        } catch (err) {
          if (isRateLimitError(err) && attempt < MAX_RATE_LIMIT_RETRIES) {
            attempt++;
            console.log(`Rate limited — waiting ${RATE_LIMIT_RETRY_WAIT_MS / 1000}s before retry ${attempt}/${MAX_RATE_LIMIT_RETRIES}...`);
            await sleep(RATE_LIMIT_RETRY_WAIT_MS);
            continue;
          }
          // This script is resumable (see the up-to-date check above) — a page that won't go
          // through after MAX_RATE_LIMIT_RETRIES attempts, or a non-rate-limit error, should
          // cost this one page, not the whole multi-hour run. Log it and move on; re-running
          // the script later will pick up anything still missing.
          failed += pending.length;
          const message = err instanceof Error ? err.message : String(err);
          console.error(`Giving up on page through component ${cursor} after repeated failures: ${message}`);
          break;
        }
      }
    }

    console.log(`Progress: embedded ${done}, skipped ${skipped}, failed ${failed} (through component id ${cursor})`);
  }

  console.log(`Done. Embedded ${done}, skipped ${skipped} already up to date, failed ${failed}.`);
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => db.$disconnect());
