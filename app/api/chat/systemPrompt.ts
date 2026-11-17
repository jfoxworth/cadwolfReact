import { readFileSync } from "fs";
import { join } from "path";

/**
 * The system prompt for every non-Build chat call on a page type: prompts/_shared.md followed by
 * prompts/<pageType>.md. It lives in its own file, not in route.ts, because a Next.js route file can only
 * export route handlers, and /ai/document needs to build the same text to show it.
 */
export function getSystemPrompt(pageType: string): string {
  const shared = readFileSync(join(process.cwd(), "prompts", "_shared.md"), "utf-8");
  const specific = readFileSync(join(process.cwd(), "prompts", `${pageType}.md`), "utf-8");
  return `${shared}\n\n${specific}`;
}
