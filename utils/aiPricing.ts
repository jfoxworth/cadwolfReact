// What a model call costs, worked out from its token counts. Used by the playground
// (/ai/playground) to show estimates. Free of server-only imports so the page can use it.
//
// Dollars per million tokens, as listed in the Claude API reference for each model. These are
// list prices: check them against Anthropic's pricing page when a model or price changes. Cache
// reads and 5-minute cache writes are the rates for the default cache time the chat uses.
import type { AiModelKey } from "./aiModels";

export interface TokenParts {
  /** Input tokens that were not served from or written to the cache. */
  input: number;
  /** Input tokens served from the prompt cache. */
  cacheRead: number;
  /** Input tokens written to the prompt cache. */
  cacheWrite: number;
  /** Output tokens. Thinking is billed as output. */
  output: number;
}

export type CostParts = TokenParts & { total: number };

const RATES: Record<AiModelKey, TokenParts> = {
  sonnet: { input: 2, cacheRead: 0.2, cacheWrite: 2.5, output: 10 },
  opus: { input: 4, cacheRead: 0.2, cacheWrite: 5, output: 20 },
  // Haiku has two rate cards, chosen by prompt length (see below).
  haiku: { input: 0.1, cacheRead: 0.01, cacheWrite: 0.125, output: 0.5 },
};
const HAIKU_LONG: TokenParts = { input: 0.5, cacheRead: 0.05, cacheWrite: 0.625, output: 2.5 };
const HAIKU_LONG_PROMPT = 100_000;

/** Dollars per million tokens for this call. Haiku's rate rises when the whole prompt (cached or
 *  not) is over 100K tokens. */
export function ratesFor(model: AiModelKey, tokens: TokenParts): TokenParts {
  const prompt = tokens.input + tokens.cacheRead + tokens.cacheWrite;
  return model === "haiku" && prompt > HAIKU_LONG_PROMPT ? HAIKU_LONG : RATES[model];
}

/** The cost of one call in dollars, in parts and in total. */
export function callCost(model: AiModelKey, tokens: TokenParts): CostParts {
  const rates = ratesFor(model, tokens);
  const input = (tokens.input * rates.input) / 1e6;
  const cacheRead = (tokens.cacheRead * rates.cacheRead) / 1e6;
  const cacheWrite = (tokens.cacheWrite * rates.cacheWrite) / 1e6;
  const output = (tokens.output * rates.output) / 1e6;
  return { input, cacheRead, cacheWrite, output, total: input + cacheRead + cacheWrite + output };
}
