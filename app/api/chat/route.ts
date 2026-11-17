import { NextRequest, NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { getSessionUser } from "@/utils/getSessionUser";
import { TYPE_ROUTE } from "@/utils/resolveRoute";
import {
  TOOLS_BY_PAGE_TYPE, SEARCH_TOOL_NAME, READ_DOCUMENT_TOOL_NAME,
  READ_PART_TREE_TOOL_NAME, getPartTreeTools, getDocumentTools,
} from "./tools";
import { runDocumentBuild } from "./documentBuild";
import { getSystemPrompt } from "./systemPrompt";
import { messageCost } from "@/utils/aiPricing";
import { searchDocuments } from "@/utils/searchEmbeddings";
import { readDocumentForChat } from "@/utils/readDocument";
import { readPartTreeForChat } from "@/utils/readPartTree";
import { anthropicClient as client } from "@/utils/anthropicClient";
import { db } from "@/utils/db";
import { DEFAULT_MODEL_KEY, isAiModelKey, resolveModelId, DEFAULT_EFFORT_KEY, isAiEffortKey } from "@/utils/aiModels";

// Tool names executed server-side within the same turn (their result is fed back as a
// tool_result before the model finishes) rather than forwarded to the client as a proposal to
// apply — see the toolResults loop below.
const SERVER_EXECUTED_TOOL_NAMES = new Set([
  SEARCH_TOOL_NAME, READ_DOCUMENT_TOOL_NAME, READ_PART_TREE_TOOL_NAME,
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

export async function POST(req: NextRequest) {
  const { userId } = await getSessionUser();

  const allowedUserId = process.env.ALLOWED_CHAT_USER_ID
    ? parseInt(process.env.ALLOWED_CHAT_USER_ID)
    : null;

  if (!allowedUserId || userId !== allowedUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { messages, pagePath, pageContext, pageImages, pageEquations, selectedBlockContext, mode, modelKey, effortKey, trace } = await req.json();

  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // The client sends only a model *key*, validated against the allowlist — never a raw model id.
  // Falls back to the user's saved preference if the key is missing or unrecognized.
  let aiModelKey = isAiModelKey(modelKey) ? modelKey : null;
  let aiEffortKey = isAiEffortKey(effortKey) ? effortKey : null;
  if (!aiModelKey || !aiEffortKey) {
    const saved = await db.user.findUnique({ where: { id: userId }, select: { aiModel: true, aiEffort: true } });
    aiModelKey ??= isAiModelKey(saved?.aiModel) ? saved.aiModel : DEFAULT_MODEL_KEY;
    aiEffortKey ??= isAiEffortKey(saved?.aiEffort) ? saved.aiEffort : DEFAULT_EFFORT_KEY;
  }

  // Tells the model what "this"/"it" refers to when the user doesn't spell it out. Block
  // selection is purely an editor convenience now (it drives where a new block gets inserted)
  // and is independent of chat mode, so it's not a reliable signal of what the user means in
  // conversation — always assume they mean the document as a whole. Not authoritative on its
  // own (a user can still explicitly ask about something else), just a default assumption.
  // The one exception is Inspect mode on a document: there the user's selected block is the thing being
  // worked on, so the browser's note naming it (id, type, name, content) is passed to the model and "this"
  // means that block. In every other mode the note is not sent on, because those modes work on the whole page.
  const inspectSelection =
    derivePageType(pagePath) === "document" && mode === "inspect"
    && typeof selectedBlockContext === "string" && selectedBlockContext.startsWith("[User has this block selected")
      ? selectedBlockContext
      : null;
  // In Overview the model is told its mode outright. It has no block tools there, and without this it has to
  // work that out from its tool list, so a request to change something could get a vague or wrong answer.
  const overviewNote =
    derivePageType(pagePath) === "document" && mode === "overview"
      ? `[Mode: Overview. You cannot change the document in this mode. If the user asks you to add, edit or delete anything, say plainly that Overview is read-only and that they can switch to Inspect or Build.]`
      : null;
  const referentHint = inspectSelection
    ? `[If the user says "this" or "it" without naming something specific, they mean the selected block.]`
    : `[If the user says "this" or "it" without naming something specific, they mean the document as a whole.]`;

  // Inject page path + referent hint + live page content into the LAST message (the turn the
  // model is actually about to answer), not the first. pageContext is rebuilt fresh and resent
  // by the client on every turn (see context/ChatContext.tsx's sendMessage), but it used to
  // always get spliced onto message index 0 — the oldest turn in the conversation. That meant a
  // multi-turn conversation kept re-reading the SAME turn-1 snapshot's position (even though its
  // *content* was live each request), with no signal that it was actually being refreshed — so
  // past turn 1 the model effectively never noticed blocks it had already added, or whether they
  // solved, confirmed live in the document. Anchoring it to the newest message every turn means
  // the model always sees the document's actual current state right before responding.
  const contextPrefix = [
    pagePath ? `[User is on page: ${pagePath}]` : null,
    referentHint,
    overviewNote,
    inspectSelection,
    pageContext ? `[Current page contents:\n${pageContext}\n]`
      // An empty document sends an empty string. Without this line the model sees no page
      // contents at all and reads that as "the document was not provided".
      : pageContext === "" && derivePageType(pagePath) === "document" ? `[Current page contents: the document is empty. This is a blank document, not a missing one.]`
      : null,
  ].filter(Boolean).join("\n");

  // Document pages' IMAGE blocks (context/ChatContext.tsx's pageImagesRef, set from
  // documentWrapper.tsx) — already public, unauthenticated S3 URLs, so Claude can fetch them
  // directly via the "url" image source type with no fetching/base64 work on our end.
  const imageBlocks: Anthropic.ImageBlockParam[] = (Array.isArray(pageImages) ? pageImages : [])
    .filter((url: unknown): url is string => typeof url === "string" && url.length > 0)
    .map((url: string) => ({ type: "image", source: { type: "url", url } }));

  // The user's own words in the latest message are marked as theirs, so the model can tell them
  // apart from the page context and the notes the server adds around them.
  const lastIndex = messages.length - 1;
  const messagesWithContext = contextPrefix
    ? messages.map((msg: { role: string; content: string }, i: number) => {
        if (i !== lastIndex || msg.role !== "user") return msg;
        const text = `${contextPrefix}\n\nUser prompt:\n${msg.content}`;
        return {
          ...msg,
          content: imageBlocks.length > 0
            ? [{ type: "text", text }, ...imageBlocks] as Anthropic.ContentBlockParam[]
            : text,
        };
      })
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
  // Build mode on a Document page runs in three steps (classify, solve, then write) — see documentBuild.ts.
  const twoStepBuild = pageType === "document" && mode === "build";
  const buildAbort = new AbortController();
  const readable = new ReadableStream({
    async start(controller) {
      const emit = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      let currentMessages = messagesWithContext;
      // Summed across every underlying API call this request makes (tool-result rounds and
      // max_tokens continuations each count) and reported once at the end as a "usage" event.
      const totalUsage = { input: 0, output: 0, cost: 0 };

      try {
        if (twoStepBuild) {
          await runDocumentBuild({
            messages: messagesWithContext as Anthropic.MessageParam[],
            existingEquations: (Array.isArray(pageEquations) ? pageEquations : [])
              .filter((r: unknown): r is string => typeof r === "string"),
            userId,
            modelKey: aiModelKey,
            effortKey: aiEffortKey,
            emit,
            usage: totalUsage,
            signal: buildAbort.signal,
            // Set only by the playground (/ai/documentPlayground) to also stream what each call sent and thought.
            trace: trace === true,
          });
        } else for (let attempt = 0; ; attempt++) {
          const stream = client.messages.stream({
            model: resolveModelId(aiModelKey),
            max_tokens: 16000,
            output_config: { effort: aiEffortKey },
            // Prompt caching: the system prompt and tools are large and unchanging, and the
            // conversation grows from turn to turn. See the same two markers in documentBuild.ts.
            cache_control: { type: "ephemeral" },
            system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
            tools: pageType === "part-tree" ? getPartTreeTools(mode)
              : pageType === "document" ? getDocumentTools(mode)
              : (TOOLS_BY_PAGE_TYPE[pageType] ?? []),
            messages: currentMessages,
          } as Parameters<typeof client.messages.stream>[0]);
          currentStream = stream;

          stream.on("text", (text) => emit({ type: "text", text }));

          const message = await stream.finalMessage();
          totalUsage.input += (message.usage.input_tokens ?? 0)
            + (message.usage.cache_creation_input_tokens ?? 0)
            + (message.usage.cache_read_input_tokens ?? 0);
          totalUsage.output += message.usage.output_tokens ?? 0;
          totalUsage.cost += messageCost(aiModelKey, message);
          const toolUseBlocks = message.content.filter(
            (b): b is Extract<typeof b, { type: "tool_use" }> => b.type === "tool_use",
          );
          const serverCalls = toolUseBlocks.filter((b) => SERVER_EXECUTED_TOOL_NAMES.has(b.name));

          // Every tool call gets emitted to the client — including server-executed ones, so
          // they're visible in the transcript like any other call — but those are also executed
          // server-side below, unlike every other tool (which the client applies itself).
          for (const block of toolUseBlocks) {
            emit({ type: "tool_use", id: block.id, name: block.name, input: block.input });
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
                // Mutating proposal tools (the client applies them) have nothing to execute
                // here — just a placeholder result so the API's per-tool_use requirement is
                // satisfied on the rare path where one coexists with a server call in the
                // same message.
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
        if (totalUsage.input || totalUsage.output) {
          try { emit({ type: "usage", input: totalUsage.input, output: totalUsage.output, cost: totalUsage.cost }); } catch { /* stream already cancelled */ }
        }
        controller.close();
      }
    },
    cancel() {
      currentStream?.controller.abort();
      buildAbort.abort();
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
