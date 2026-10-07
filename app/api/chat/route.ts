import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { getSessionUser } from "@/utils/getSessionUser";
import { TYPE_ROUTE } from "@/utils/resolveRoute";
import {
  TOOLS_BY_PAGE_TYPE, SEARCH_TOOL_NAME, READ_DOCUMENT_TOOL_NAME,
  READ_PART_TREE_TOOL_NAME, FIND_SIMILAR_PART_TREES_TOOL_NAME, PROPOSE_BUILD_PLAN_TOOL_NAME,
  PROPOSE_REQUIREMENTS_REVIEW_TOOL_NAME, getPartTreeTools,
} from "./tools";
import { searchDocuments } from "@/utils/searchEmbeddings";
import { readDocumentForChat } from "@/utils/readDocument";
import { readPartTreeForChat } from "@/utils/readPartTree";
import { findSimilarPartTreesForChat } from "@/utils/findSimilarPartTrees";
import { anthropicClient as client } from "@/utils/anthropicClient";

// Tool names executed server-side within the same turn (their result is fed back as a
// tool_result before the model finishes) rather than forwarded to the client as a proposal to
// apply — see the toolResults loop below.
const SERVER_EXECUTED_TOOL_NAMES = new Set([
  SEARCH_TOOL_NAME, READ_DOCUMENT_TOOL_NAME, READ_PART_TREE_TOOL_NAME, FIND_SIMILAR_PART_TREES_TOOL_NAME,
]);

// The Build-mode wizard's three checkpoint tools — each one is a point where the UI must stop
// and let the user act (pick a candidate, settle requirements, approve a tree) before anything
// else happens. Whichever of these appears first in a message wins: every other tool_use block
// alongside it in that same message is dropped (not emitted, not executed) and the turn ends
// right after handling it, rather than letting the model keep going — or skip straight past the
// checkpoint — within the same request. See the toolUseBlocks loop below.
const CHECKPOINT_TOOL_NAMES = new Set([
  FIND_SIMILAR_PART_TREES_TOOL_NAME, PROPOSE_REQUIREMENTS_REVIEW_TOOL_NAME, PROPOSE_BUILD_PLAN_TOOL_NAME,
]);

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

  const { messages, pagePath, pageContext, currentFileId, mode } = await req.json();

  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Tells the model what "this"/"it" refers to when the user doesn't spell it out. Block
  // selection is purely an editor convenience now (it drives where a new block gets inserted)
  // and is independent of chat mode, so it's not a reliable signal of what the user means in
  // conversation — always assume they mean the document as a whole. Not authoritative on its
  // own (a user can still explicitly ask about something else), just a default assumption.
  const referentHint =
    `[If the user says "this" or "it" without naming something specific, they mean the document as a whole.]`;

  // Inject page path + referent hint + live page content into the first user message.
  const contextPrefix = [
    pagePath ? `[User is on page: ${pagePath}]` : null,
    referentHint,
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
            tools: pageType === "part-tree" ? getPartTreeTools(mode) : (TOOLS_BY_PAGE_TYPE[pageType] ?? []),
            messages: currentMessages,
          } as Parameters<typeof client.messages.stream>[0]);
          currentStream = stream;

          stream.on("text", (text) => emit({ type: "text", text }));

          const message = await stream.finalMessage();
          const toolUseBlocks = message.content.filter(
            (b): b is Extract<typeof b, { type: "tool_use" }> => b.type === "tool_use",
          );
          const serverCalls = toolUseBlocks.filter((b) => SERVER_EXECUTED_TOOL_NAMES.has(b.name));

          const checkpointBlock = toolUseBlocks.find((b) => CHECKPOINT_TOOL_NAMES.has(b.name));

          // Every tool call gets emitted to the client — including server-executed ones, so
          // they're visible in the transcript like any other call — but those are also executed
          // server-side below, unlike every other tool (which the client applies itself).
          // propose_build_plan/propose_requirements_review are neither: they're structured-
          // output calls with no side effect of their own, so each gets its own event instead
          // of the generic tool_use shape the client would otherwise try to render as a
          // mutating proposal card.
          for (const block of toolUseBlocks) {
            if (checkpointBlock && block !== checkpointBlock) continue;
            if (block.name === PROPOSE_BUILD_PLAN_TOOL_NAME) {
              emit({ type: "tree_proposal", id: block.id, tree: block.input });
            } else if (block.name === PROPOSE_REQUIREMENTS_REVIEW_TOOL_NAME) {
              // Emitted even when items is empty — the review stage still needs to hear back so
              // it can show its own "nothing found, want to add one?" state, same reasoning as
              // find_similar_part_trees's empty-candidates case below.
              emit({ type: "requirements_proposal", id: block.id, items: (block.input as { items?: unknown[] }).items ?? [] });
            } else {
              emit({ type: "tool_use", id: block.id, name: block.name, input: block.input });
            }
          }

          if (checkpointBlock) {
            if (checkpointBlock.name === FIND_SIMILAR_PART_TREES_TOOL_NAME) {
              const description = (checkpointBlock.input as { description?: string }).description ?? "";
              try {
                const fileId = Number(currentFileId);
                const { candidates } = await findSimilarPartTreesForChat(
                  userId, description, Number.isFinite(fileId) ? fileId : null,
                );
                // Emitted even when empty — Stage 2 still needs to hear back so it can show its
                // "nothing close, build from scratch" state instead of the request just going
                // quiet after the model's "let me check for similar trees" text.
                emit({ type: "candidates", items: candidates });
              } catch (err) {
                emit({ type: "text", text: `\n\n*(Search failed: ${err instanceof Error ? err.message : "unknown error"})*` });
              }
            }
            // propose_build_plan / propose_requirements_review need no further handling here —
            // already emitted as their own event in the per-block loop above.
            break;
          }

          if (serverCalls.length > 0) {
            if (attempt >= MAX_CONTINUATIONS) {
              emit({ type: "text", text: "\n\n*(Reached this turn's lookup limit — try asking again if you still need more.)*" });
              break;
            }
            // Resolve every tool_use in this message with a matching tool_result — the API
            // requires one for each before the conversation can continue, even for the
            // non-server calls, whose real "execution" is the client applying them, not
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
              } else if (block.name === READ_DOCUMENT_TOOL_NAME) {
                const fileId = Number((block.input as { fileId?: string }).fileId);
                let resultText: string;
                try {
                  resultText = Number.isFinite(fileId)
                    ? await readDocumentForChat(fileId, userId)
                    : "That id isn't a valid document id.";
                } catch (err) {
                  resultText = `Couldn't read that document: ${err instanceof Error ? err.message : "unknown error"}`;
                }
                toolResults.push({ type: "tool_result", tool_use_id: block.id, content: resultText });
              } else if (block.name === READ_PART_TREE_TOOL_NAME) {
                const fileId = Number((block.input as { fileId?: string }).fileId);
                let resultText: string;
                try {
                  resultText = Number.isFinite(fileId)
                    ? await readPartTreeForChat(fileId, userId)
                    : "That id isn't a valid part tree id.";
                } catch (err) {
                  resultText = `Couldn't read that part tree: ${err instanceof Error ? err.message : "unknown error"}`;
                }
                toolResults.push({ type: "tool_result", tool_use_id: block.id, content: resultText });
              } else {
                // Covers mutating proposal tools (client applies them) and propose_build_plan/
                // propose_requirements_review (already emitted above as their own event) —
                // neither has anything to execute here, just a placeholder result so the API's
                // per-tool_use requirement is satisfied on the rare path where one of these
                // coexists with a server call in the same message. None of the three checkpoint
                // tools (CHECKPOINT_TOOL_NAMES) ever reach this loop — they're handled, and the
                // turn ended, above.
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
