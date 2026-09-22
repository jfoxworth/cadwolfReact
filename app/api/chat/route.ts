import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { join } from "path";
import { getSessionUser } from "@/utils/getSessionUser";
import { TYPE_ROUTE } from "@/utils/resolveRoute";
import { TOOLS_BY_PAGE_TYPE, SEARCH_TOOL_NAME } from "./tools";
import { searchDocuments } from "@/utils/searchEmbeddings";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const PAGE_TYPES = new Set(Object.values(TYPE_ROUTE));

// pagePath's first segment already matches resolveRoute.ts's own route segments
// ("document" | "dataset" | "part-tree" | "workspace") — no separate client-side
// page-type signal needed. Anything unrecognized (root "/", other misc routes)
// falls back to the workspace prompt/tools, the most generic of the four.
function derivePageType(pagePath: string | undefined): string {
  const segment = pagePath?.split("/").filter(Boolean)[0];
  return segment && PAGE_TYPES.has(segment) ? segment : "workspace";
}

function getSystemPrompt(pageType: string): string {
  const shared = readFileSync(join(process.cwd(), "prompts", "_shared.md"), "utf-8");
  const specific = readFileSync(join(process.cwd(), "prompts", `${pageType}.md`), "utf-8");
  return `${shared}\n\n${specific}`;
}

export async function POST(req: NextRequest) {
  const { userId } = await getSessionUser();

  const allowedUserId = process.env.ALLOWED_CHAT_USER_ID
    ? parseInt(process.env.ALLOWED_CHAT_USER_ID)
    : null;

  if (!allowedUserId || userId !== allowedUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { messages, pagePath, pageContext, selectedBlockContext } = await req.json();

  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Inject page path + selected-block context + live page content into the first user message.
  // Selected-block context is listed separately, ahead of the full page dump, since it's a
  // higher-priority (but not authoritative — verify it's actually relevant) hint about intent.
  const contextPrefix = [
    pagePath ? `[User is on page: ${pagePath}]` : null,
    selectedBlockContext || null,
    pageContext ? `[Current page contents:\n${pageContext}\n]` : null,
  ].filter(Boolean).join("\n");

  const messagesWithContext = contextPrefix
    ? messages.map((msg: { role: string; content: string }, i: number) =>
        i === 0 && msg.role === "user"
          ? { ...msg, content: `${contextPrefix}\n\n${msg.content}` }
          : msg
      )
    : messages;

  const pageType = derivePageType(pagePath);
  const systemPrompt = getSystemPrompt(pageType);

  const encoder = new TextEncoder();

  // A request asking for a lot of content (e.g. "add headers/equations explaining and
  // solving X") can run past max_tokens before finishing — the model just stops mid-task,
  // which silently drops whatever it hadn't gotten to yet (often the last, most important
  // part). Rather than raise the ceiling and hope, detect stop_reason === "max_tokens" and
  // continue automatically with a fresh internal turn, bounded so a genuinely runaway
  // request still terminates with a message instead of looping or billing forever.
  const MAX_CONTINUATIONS = 3;

  // NDJSON, not plain text: a response can now be a mix of prose and one or more
  // proposed block edits (tool calls), so each line is a typed event instead of a
  // raw text chunk. { type: "text", text } streams incrementally as before;
  // { type: "tool_use", ... } is emitted once per completed call, since tool inputs
  // only exist once fully formed. All of this may span more than one underlying API
  // call (see the continuation loop below) — the client can't tell the difference,
  // it just sees more events arrive before the stream closes.
  let currentStream: ReturnType<typeof client.messages.stream> | null = null;
  const readable = new ReadableStream({
    async start(controller) {
      const emit = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      let currentMessages = messagesWithContext;

      try {
        for (let attempt = 0; ; attempt++) {
          const stream = client.messages.stream({
            model: process.env.AI_MODEL ?? "claude-haiku-4-5-20251001",
            max_tokens: 8192,
            system: systemPrompt,
            tools: TOOLS_BY_PAGE_TYPE[pageType] ?? [],
            messages: currentMessages,
          } as Parameters<typeof client.messages.stream>[0]);
          currentStream = stream;

          stream.on("text", (text) => emit({ type: "text", text }));

          const message = await stream.finalMessage();
          const toolUseBlocks = message.content.filter(
            (b): b is Extract<typeof b, { type: "tool_use" }> => b.type === "tool_use",
          );
          const searchCalls = toolUseBlocks.filter((b) => b.name === SEARCH_TOOL_NAME);

          // Every tool call gets emitted to the client — including search_documents, so it's
          // visible in the transcript like any other call — but search is also executed
          // server-side below, unlike every other tool (which the client applies itself).
          for (const block of toolUseBlocks) {
            emit({ type: "tool_use", id: block.id, name: block.name, input: block.input });
          }

          if (searchCalls.length > 0) {
            if (attempt >= MAX_CONTINUATIONS) {
              emit({ type: "text", text: "\n\n*(Reached this turn's search limit — try asking again if you still need more.)*" });
              break;
            }
            // Resolve every tool_use in this message with a matching tool_result — the API
            // requires one for each before the conversation can continue, even for the
            // non-search calls, whose real "execution" is the client applying them, not
            // anything happening here.
            const toolResults: { type: "tool_result"; tool_use_id: string; content: string }[] = [];
            for (const block of toolUseBlocks) {
              if (block.name === SEARCH_TOOL_NAME) {
                const query = (block.input as { query?: string }).query ?? "";
                let resultText: string;
                try {
                  const results = await searchDocuments(userId, query);
                  resultText = results.length > 0
                    ? results.map((r) => `[Document: "${r.fileName}"] ${r.chunkText}`).join("\n\n")
                    : "No relevant content found.";
                } catch (err) {
                  resultText = `Search failed: ${err instanceof Error ? err.message : "unknown error"}`;
                }
                toolResults.push({ type: "tool_result", tool_use_id: block.id, content: resultText });
              } else {
                toolResults.push({ type: "tool_result", tool_use_id: block.id, content: "Proposed to the user for review." });
              }
            }
            currentMessages = [
              ...currentMessages,
              { role: "assistant", content: message.content },
              { role: "user", content: toolResults },
            ];
            continue;
          }

          if (message.stop_reason !== "max_tokens") break;

          if (attempt >= MAX_CONTINUATIONS) {
            emit({ type: "text", text: "\n\n*(Ran out of room to finish this in one go — here's what I've added so far; ask me to continue for the rest.)*" });
            break;
          }

          // Continue the task with a fresh turn rather than resuming mid-generation —
          // Anthropic has no way to splice back into a tool call truncated mid-argument.
          // Drop any tool_use blocks from the partial assistant turn (already emitted
          // above; the model doesn't need to see its own prior calls to keep going, and
          // an assistant turn with unresolved tool_use blocks would require matching
          // tool_result blocks to satisfy the API on the next call, which don't apply
          // here since these "tools" are UI proposals, not server-executed functions).
          const partialText = message.content
            .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
            .map((b) => b.text)
            .join("");
          const doneSummary = message.content
            .filter((b): b is Extract<typeof b, { type: "tool_use" }> => b.type === "tool_use")
            .map((b) => b.name)
            .join(", ");
          currentMessages = [
            ...currentMessages,
            { role: "assistant", content: partialText || "(continuing)" },
            {
              role: "user",
              content: `[You were cut off by a length limit before finishing. So far in this response you already proposed: ${doneSummary || "nothing yet"}. Continue the same task — don't repeat those, just pick up with whatever you haven't gotten to yet.]`,
            },
          ];
        }
      } catch (err) {
        emit({ type: "error", message: err instanceof Error ? err.message : "Something went wrong." });
      } finally {
        controller.close();
      }
    },
    cancel() {
      currentStream?.controller.abort();
    },
  });

  return new NextResponse(readable, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
