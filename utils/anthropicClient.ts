import Anthropic from "@anthropic-ai/sdk";

/** Shared Anthropic client — used by the conversational chat route (app/api/chat/route.ts) and
 *  the non-conversational per-document content-generation route (app/api/part-tree/generate-document),
 *  so the API key/client setup exists in exactly one place. */
export const anthropicClient = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
