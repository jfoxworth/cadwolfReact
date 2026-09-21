// Thin wrapper around Voyage AI's embeddings endpoint — server-only (reads VOYAGE_API_KEY,
// same convention as ANTHROPIC_API_KEY in app/api/chat/route.ts; never call this from a
// client component). https://docs.voyageai.com/reference/embeddings-api
const VOYAGE_MODEL = "voyage-4-lite";
const VOYAGE_DIMENSIONS = 1024;
// Voyage accepts at most 1000 inputs per request.
const MAX_BATCH = 1000;

export interface VoyageEmbedResult {
  embeddings: number[][];
  totalTokens: number;
}

/** Embeds up to 1000 texts in one call. `inputType` matters for retrieval quality — Voyage's
 *  asymmetric encoding expects "document" for stored content and "query" for search queries;
 *  using the wrong one doesn't error, it just makes retrieval worse. */
export async function voyageEmbed(texts: string[], inputType: "document" | "query"): Promise<VoyageEmbedResult> {
  if (texts.length === 0) return { embeddings: [], totalTokens: 0 };
  if (texts.length > MAX_BATCH) {
    throw new Error(`voyageEmbed: ${texts.length} texts exceeds Voyage's ${MAX_BATCH}-per-request limit — batch the caller instead.`);
  }

  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) throw new Error("VOYAGE_API_KEY is not set.");

  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: VOYAGE_MODEL,
      input: texts,
      input_type: inputType,
      output_dimension: VOYAGE_DIMENSIONS,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Voyage embeddings request failed: ${res.status} ${body}`);
  }

  const json = await res.json() as {
    data: { embedding: number[]; index: number }[];
    usage?: { total_tokens?: number };
  };

  // Voyage returns results in the same order as the input, but sort by `index` defensively
  // rather than assuming that ordering guarantee always holds.
  const embeddings = [...json.data]
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);

  return { embeddings, totalTokens: json.usage?.total_tokens ?? 0 };
}

export { VOYAGE_MODEL, VOYAGE_DIMENSIONS };
