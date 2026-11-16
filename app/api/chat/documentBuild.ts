// Build mode on a Document page works in three steps instead of one:
//
//   1. Classify (prompts/document-classify.md). The model reads the request and the document and
//      submits classify_request: a scenario (what job the next steps are doing and what they are
//      being given) and a problem statement (the problem, its inputs and the expected result).
//      Both are added to the end of the user's message, which already holds the document, so the
//      next two steps receive them. If this step fails, the build carries on without them.
//   2. Solve (prompts/document-solve.md + the platform reference). The model's only job is the
//      mathematics: it submits the equations with solve_problem. They are solved here, on the
//      server, and the results, errors and impossible values go back to it until they are clean or
//      the rounds run out. Nothing reaches the user's document in this step.
//   3. Write (prompts/document-write.md + the platform reference). A separate call is given the
//      solved equations and writes the document around them with write_document: headers, text,
//      symbolic equations, and each solved equation placed by step number, so this step cannot
//      change a number. Code checks every step appears once, in order. The blocks are then sent to
//      the browser as ordinary block proposals, so applying, re-solving and Undo work as before.
//
// This is the same split the part agent uses (agents/partAgent.ts) and it reuses its solver call
// and its checks. See app/ai/document/page.tsx for the picture.
import { readFileSync } from "fs";
import { join } from "path";
import type Anthropic from "@anthropic-ai/sdk";
import { anthropicClient as client } from "@/utils/anthropicClient";
import { resolveModelId, type AiEffortKey, type AiModelKey } from "@/utils/aiModels";
import { messageCost } from "@/utils/aiPricing";
import { searchDocuments } from "@/utils/searchEmbeddings";
import { solvePartEquations, type SolvedEquation } from "@/agents/solvePartDocument";
import { STEP_ROLES, type StepRole } from "@/agents/partAgentTools";
import { textToHtml } from "@/agents/writeDesignDocument";
import { SEARCH_TOOL, SEARCH_TOOL_NAME } from "./tools";

export const CLASSIFY_TOOL_NAME = "classify_request";
export const SOLVE_PROBLEM_TOOL_NAME = "solve_problem";
export const WRITE_DOCUMENT_TOOL_NAME = "write_document";

const MAX_CLASSIFY_ROUNDS = 2;
const MAX_SOLVE_ROUNDS = 2;
const MAX_WRITE_ROUNDS = 2;
const MAX_STEPS = 120;
const MAX_BLOCKS = 300;
const MAX_TOKENS = 16000;

// ─── tools ──────────────────────────────────────────────────────────────────

export const CLASSIFY_TOOL: Anthropic.Tool = {
  name: CLASSIFY_TOOL_NAME,
  description:
    "Set the task up for the steps after you. Give the scenario and the problem statement. Do not solve anything and do not write any of the document.",
  input_schema: {
    type: "object",
    properties: {
      scenario: {
        type: "string",
        description:
          "One or two sentences addressed to the next steps (\"You are ...\") saying what job they are doing and what the problem statement and the document are for in it.",
      },
      problem_statement: {
        type: "string",
        description:
          "The task in plain prose: the problem, the inputs it gives (values and units as stated), and the expected result. Self-contained. No solution.",
      },
    },
    required: ["scenario", "problem_statement"],
  },
};

export const SOLVE_PROBLEM_TOOL: Anthropic.Tool = {
  name: SOLVE_PROBLEM_TOOL_NAME,
  description:
    "Submit the mathematics for the request: its equations in the order they must be solved, each with its reason. They are solved and the results, errors and impossible values come back. If anything is wrong, fix it and call this again with the WHOLE list. When nothing is wrong the list is accepted and you are done. If the request needs no calculation (a question, a note, a heading), call this with an empty list. Do not write headings or prose here.",
  input_schema: {
    type: "object",
    properties: {
      steps: {
        type: "array",
        description: "Every equation the request needs, one per step, in the order they must be solved. Empty if none.",
        items: {
          type: "object",
          properties: {
            raw: { type: "string", description: "`name = expression` in the platform's syntax." },
            role: {
              type: "string",
              enum: [...STEP_ROLES],
              description:
                "given: a value stated in the problem or an assumption. choice: a decision such as a material or a size. calculation: worked out from earlier steps. check: a pass/fail test that must give 1 (met) or 0 (not met). output: a final result the user asked for.",
            },
            why: {
              type: "string",
              description:
                "One or two plain sentences, the way an engineer would explain it to a colleague: where a given comes from, why a choice was made, what a calculation finds, what a check tests. The next step turns these into the explanation a person reads.",
            },
            positive: {
              type: "boolean",
              description:
                "True if the result must be greater than zero (a size, area, length, mass, strength, count). False for quantities that can be zero or negative, such as a coordinate difference or a force direction.",
            },
          },
          required: ["raw", "why"],
        },
      },
    },
    required: ["steps"],
  },
};

export const WRITE_DOCUMENT_TOOL: Anthropic.Tool = {
  name: WRITE_DOCUMENT_TOOL_NAME,
  description:
    "Write the blocks to add to the document, in display order: headers, text, symbolic equations, and each solved calculation step placed once as an equation block. If something is wrong the problems are returned; fix them and call this again with ALL the blocks.",
  input_schema: {
    type: "object",
    properties: {
      blocks: {
        type: "array",
        description: "All the blocks to add, in display order.",
        items: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["header", "text", "symbolic", "equation"] },
            text: { type: "string", description: "header: the heading. text: plain prose (no HTML or markdown); a blank line starts a new paragraph." },
            level: { type: "number", description: "header only: 1-4. Default 2." },
            latex: { type: "string", description: "symbolic only: a LaTeX expression, for a formula shown but not solved, e.g. \"\\\\sigma = \\\\frac{F}{A}\"." },
            step: { type: "number", description: "equation only: the number of the solved step to show here, as listed." },
          },
          required: ["type"],
        },
      },
    },
    required: ["blocks"],
  },
};

interface StepInput {
  raw?: unknown;
  role?: unknown;
  why?: unknown;
  positive?: unknown;
}

interface WriteBlockInput {
  type?: unknown;
  text?: unknown;
  level?: unknown;
  latex?: unknown;
  step?: unknown;
}

// ─── step 1: solve ─────────────────────────────────────────────────────────

interface Step {
  /** 1-based, as the model sees it. */
  number: number;
  raw: string;
  role: StepRole;
  why: string;
  positive: boolean;
  solved: SolvedEquation;
}

interface Solution {
  steps: Step[];
  /** What is still wrong: solve errors, failed checks, impossible values. Empty when accepted. */
  problems: string[];
  /** What the model is told after a round. */
  text: string;
}

const nameOf = (raw: string) => raw.split("=")[0]?.trim() ?? raw;

function scalarOf(solved: SolvedEquation): number | undefined {
  return solved.solution?.size === "1x1" ? solved.solution.real["0-0"] : undefined;
}

/** Solves the model's list after the equations already in the document (so it can use those
 *  variables) and reports everything still wrong with it. */
export async function evaluateSolution(input: { steps?: unknown }, existing: string[]): Promise<Solution> {
  const problems: string[] = [];

  const proposed: { raw: string; role: StepRole; why: string; positive: boolean }[] = [];
  for (const s of (Array.isArray(input.steps) ? input.steps.slice(0, MAX_STEPS) : []) as StepInput[]) {
    const raw = typeof s?.raw === "string" ? s.raw.trim() : "";
    if (!raw.includes("=")) {
      problems.push(`A step was skipped because it is not an equation: "${raw}".`);
      continue;
    }
    proposed.push({
      raw,
      role: STEP_ROLES.includes(s.role as StepRole) ? (s.role as StepRole) : "calculation",
      why: typeof s.why === "string" ? s.why.trim() : "",
      positive: s.positive === true,
    });
  }

  let solved: SolvedEquation[] = [];
  if (proposed.length > 0) {
    const before = existing.filter((r) => r.includes("=")).map((raw, i) => ({ index: -(i + 1), raw }));
    const all = await solvePartEquations(
      [...before, ...proposed.map((s, i) => ({ index: i, raw: s.raw }))],
      [],
    );
    solved = all.slice(before.length);
  }

  const steps: Step[] = proposed.map((s, i) => ({ ...s, number: i + 1, solved: solved[i] }));
  for (const step of steps) {
    const name = nameOf(step.raw);
    if (!step.why) problems.push(`Step ${step.number} (${name}) has no reason. Every step needs one.`);
    if (step.solved.error) {
      problems.push(`Step ${step.number}: ${step.raw} → ${step.solved.error}`);
      continue;
    }
    const value = scalarOf(step.solved);
    if (step.role === "check") {
      if (value === undefined || (value !== 0 && value !== 1)) {
        problems.push(`Step ${step.number}: "${name}" is a check, so it must give 1 (met) or 0 (not met). It gave ${step.solved.summary}.`);
      } else if (value === 0) {
        problems.push(`Step ${step.number}: the check "${name}" fails. Say so honestly in the 'why'; do not weaken the check. If the problem asks for a design, change the design until it passes.`);
      }
    }
    if (step.positive && value !== undefined && !(value > 0)) {
      problems.push(`Step ${step.number}: "${name}" is ${step.solved.summary}, but it must be greater than zero. Find out why and fix it.`);
    }
  }

  const text = [
    steps.length ? "Results:\n" + steps.map((s) => `step ${s.number} [${s.role}] ${s.raw} → ${s.solved.summary}`).join("\n") : "",
    problems.length
      ? `Problems:\n${problems.join("\n")}\n\n${problems.length} problem${problems.length === 1 ? "" : "s"}. Fix them and call ${SOLVE_PROBLEM_TOOL_NAME} again with the whole list.`
      : "No problems. The list is accepted.",
  ].filter(Boolean).join("\n\n");

  return { steps, problems, text };
}

// ─── step 2: write ─────────────────────────────────────────────────────────

type ProposedBlock =
  | { name: "header_block"; input: { text: string; level: number } }
  | { name: "text_block"; input: { text: string } }
  | { name: "symbolic_equation_block"; input: { expression: string } }
  | { name: "equation_block"; input: { raw: string } };

/** Builds the blocks from the model's list and reports what is wrong with it: every solved step
 *  must appear once, in order, so no equation can be changed or lost. */
export function evaluateDocument(
  input: { blocks?: unknown },
  steps: Step[],
): { blocks: ProposedBlock[]; problems: string[] } {
  const problems: string[] = [];
  const blocks: ProposedBlock[] = [];
  const used: number[] = [];
  let texts = 0;

  for (const b of (Array.isArray(input.blocks) ? input.blocks.slice(0, MAX_BLOCKS) : []) as WriteBlockInput[]) {
    const text = typeof b?.text === "string" ? b.text.trim() : "";
    if (b?.type === "header" && text) {
      const level = Math.min(Math.max(Math.round(Number(b.level) || 2), 1), 4);
      blocks.push({ name: "header_block", input: { text, level } });
    } else if (b?.type === "text" && text) {
      texts++;
      blocks.push({ name: "text_block", input: { text: textToHtml(text) } });
    } else if (b?.type === "symbolic" && typeof b.latex === "string" && b.latex.trim()) {
      blocks.push({ name: "symbolic_equation_block", input: { expression: b.latex.trim() } });
    } else if (b?.type === "equation") {
      const n = Number(b.step);
      const step = steps.find((s) => s.number === n);
      if (!step) problems.push(`An equation block refers to step ${b.step}, which does not exist.`);
      else if (used.includes(n)) problems.push(`Step ${n} is placed more than once.`);
      else if (used.length && n < used[used.length - 1]) problems.push(`Step ${n} is placed after step ${used[used.length - 1]}. Keep the steps in their numbered order.`);
      else {
        used.push(n);
        blocks.push({ name: "equation_block", input: { raw: step.raw } });
      }
    } else {
      problems.push(`A ${String(b?.type ?? "unknown")} block was skipped because it was empty or malformed.`);
    }
  }
  if (steps.length > 0) {
    const missing = steps.filter((s) => !used.includes(s.number)).map((s) => s.number);
    if (missing.length) problems.push(`These steps are not in the document: ${missing.join(", ")}. Every step must appear once.`);
    if (texts === 0) problems.push("The document has no text. It must explain the problem and the solution.");
  }
  return { blocks, problems };
}

/** What the writing step falls back to: each step's reason, then its equation. Plain, but correct. */
function plainDocument(steps: Step[]): ProposedBlock[] {
  const blocks: ProposedBlock[] = [];
  for (const s of steps) {
    blocks.push({ name: "text_block", input: { text: textToHtml(s.why || nameOf(s.raw)) } });
    blocks.push({ name: "equation_block", input: { raw: s.raw } });
  }
  return blocks;
}

// ─── shared ────────────────────────────────────────────────────────────────

function readPrompt(file: string): string {
  return readFileSync(join(process.cwd(), "prompts", file), "utf-8");
}

/** The platform reference from document.md: everything before the chat-behaviour sections. */
function platformReference(): string {
  return readPrompt("document.md").split("\n## Modes")[0];
}

export function classifySystemPrompt(): string {
  return `${readPrompt("_shared.md")}\n\n${readPrompt("document-classify.md")}`;
}

export function solveSystemPrompt(): string {
  return `${readPrompt("_shared.md")}\n\n${readPrompt("document-solve.md")}\n\n# Platform reference\n\n${platformReference()}`;
}

export function writeSystemPrompt(): string {
  return `${readPrompt("_shared.md")}\n\n${readPrompt("document-write.md")}\n\n# Platform reference\n\n${platformReference()}`;
}

function formatSteps(steps: Step[]): string {
  return steps
    .map((s) => `[step ${s.number}] ${s.role}: ${s.raw}\n  result: ${s.solved.summary}\n  why: ${s.why}`)
    .join("\n");
}

/** Adds text to the end of the last user message (which may be a string or content blocks). */
function appendToLast(messages: Anthropic.MessageParam[], extra: string): Anthropic.MessageParam[] {
  const out = messages.slice();
  const last = out[out.length - 1];
  if (!last || last.role !== "user") return [...out, { role: "user", content: extra }];
  out[out.length - 1] = {
    ...last,
    content: typeof last.content === "string"
      ? `${last.content}\n\n${extra}`
      : [...last.content, { type: "text", text: extra }],
  };
  return out;
}

function toolUses(message: Anthropic.Message): Extract<Anthropic.ContentBlock, { type: "tool_use" }>[] {
  return message.content.filter((b): b is Extract<Anthropic.ContentBlock, { type: "tool_use" }> => b.type === "tool_use");
}

function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Extract<Anthropic.ContentBlock, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("");
}

export interface DocumentBuildRun {
  /** The conversation, with the page context already added to the last user message. */
  messages: Anthropic.MessageParam[];
  /** Raw text of the equations already in the document, in order. */
  existingEquations: string[];
  userId: number;
  modelKey: AiModelKey;
  effortKey: AiEffortKey;
  emit: (event: Record<string, unknown>) => void;
  /** Summed across every call; the route reports it once at the end. `cost` is the estimated
   *  dollars (utils/aiPricing.ts), worked out per call because cache reads and writes are priced
   *  differently from plain input. */
  usage: { input: number; output: number; cost: number };
  signal?: AbortSignal;
  /** Playground (/ai/documentPlayground) only: also stream, for every model call, what was sent, the
   *  thinking, the tool calls and what the server replied. Normal chat requests never set it. */
  trace?: boolean;
}

function addUsage(run: DocumentBuildRun, message: Anthropic.Message) {
  run.usage.input += (message.usage.input_tokens ?? 0)
    + (message.usage.cache_creation_input_tokens ?? 0)
    + (message.usage.cache_read_input_tokens ?? 0);
  run.usage.output += message.usage.output_tokens ?? 0;
  run.usage.cost += messageCost(run.modelKey, message);
}

/** The last message as plain text: what the model was newly given in this call. */
function describeLast(messages: Anthropic.MessageParam[]): string {
  const last = messages[messages.length - 1];
  if (!last) return "";
  if (typeof last.content === "string") return last.content;
  return last.content
    .map((b) => {
      if (b.type === "text") return b.text;
      if (b.type === "tool_result") return typeof b.content === "string" ? b.content : JSON.stringify(b.content);
      return `[${b.type}]`;
    })
    .join("\n");
}

async function ask(
  run: DocumentBuildRun, label: string, system: string, tools: Anthropic.Tool[], messages: Anthropic.MessageParam[],
  onText?: (text: string) => void,
): Promise<Anthropic.Message> {
  const started = Date.now();
  if (run.trace) run.emit({ type: "step", label, system, user: describeLast(messages) });
  const stream = client.messages.stream(
    {
      model: resolveModelId(run.modelKey),
      max_tokens: MAX_TOKENS,
      // Only the playground asks for the thinking; "summarized" returns a readable summary.
      ...(run.trace ? { thinking: { type: "adaptive", display: "summarized" } } : {}),
      output_config: { effort: run.effortKey },
      // Prompt caching. The marker on the system prompt caches the tools and the system prompt
      // (the large, unchanging part) so the retry rounds and the write step read it at a
      // fraction of the price; the top-level one caches the growing conversation as it goes.
      cache_control: { type: "ephemeral" },
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      tools,
      messages,
    } as Parameters<typeof client.messages.stream>[0],
    { signal: run.signal },
  );
  if (onText) stream.on("text", onText);
  if (run.trace) {
    stream.on("streamEvent", (e) => {
      if (e.type !== "content_block_delta") return;
      const delta = e.delta as { type: string; thinking?: string };
      if (delta.type === "thinking_delta" && delta.thinking) run.emit({ type: "thinking", text: delta.thinking });
    });
  }
  const message = await stream.finalMessage();
  addUsage(run, message);
  if (run.trace) {
    run.emit({
      type: "step_done",
      stop: message.stop_reason,
      seconds: Math.round((Date.now() - started) / 100) / 10,
      // Tokens served from the prompt cache and tokens written to it, to check caching works.
      input: message.usage.input_tokens ?? 0,
      output: message.usage.output_tokens ?? 0,
      cacheRead: message.usage.cache_read_input_tokens ?? 0,
      cacheWrite: message.usage.cache_creation_input_tokens ?? 0,
      // Words already streamed to the chat (onText) are not repeated here.
      text: onText ? "" : textOf(message),
      tools: toolUses(message).map((u) => ({ name: u.name, input: u.input })),
    });
  }
  return message;
}

const CUT_OFF =
  "[You were cut off by a length limit before finishing, so that call was not used. Do it again with fewer words: shorter 'why' and text entries.]";

interface Classification {
  scenario: string;
  problemStatement: string;
}

/** Step 1. Returns the scenario and problem statement, or null if the model did not give both
 *  (the build then carries on without them). */
async function runClassify(run: DocumentBuildRun): Promise<Classification | null> {
  const system = classifySystemPrompt();
  const messages: Anthropic.MessageParam[] = run.messages.slice();
  let nudged = false;

  for (let round = 0; round < MAX_CLASSIFY_ROUNDS; round++) {
    if (run.signal?.aborted) break;
    const message = await ask(run, `Step 1: Classify, call ${round + 1}`, system, [CLASSIFY_TOOL], messages);

    if (message.stop_reason === "max_tokens") {
      if (run.trace) run.emit({ type: "reply", text: CUT_OFF });
      messages.push({ role: "assistant", content: textOf(message) || "(continuing)" });
      messages.push({ role: "user", content: CUT_OFF });
      continue;
    }

    const uses = toolUses(message).filter((u) => u.name === CLASSIFY_TOOL_NAME);
    messages.push({ role: "assistant", content: message.content });
    if (uses.length === 0) {
      if (nudged) break;
      nudged = true;
      messages.push({ role: "user", content: `Call ${CLASSIFY_TOOL_NAME} now. It is your only output.` });
      continue;
    }

    const input = uses[0].input as { scenario?: unknown; problem_statement?: unknown };
    const scenario = typeof input.scenario === "string" ? input.scenario.trim() : "";
    const problemStatement = typeof input.problem_statement === "string" ? input.problem_statement.trim() : "";
    if (scenario && problemStatement) {
      if (run.trace) run.emit({ type: "reply", text: "Accepted." });
      return { scenario, problemStatement };
    }

    const reply = `${!scenario ? "The scenario is empty. " : ""}${!problemStatement ? "The problem statement is empty. " : ""}Call ${CLASSIFY_TOOL_NAME} again with both.`;
    if (run.trace) run.emit({ type: "reply", text: reply });
    messages.push({
      role: "user",
      content: message.content
        .filter((b): b is Extract<Anthropic.ContentBlock, { type: "tool_use" }> => b.type === "tool_use")
        .map((u): Anthropic.ToolResultBlockParam => ({
          type: "tool_result",
          tool_use_id: u.id,
          content: u.name === CLASSIFY_TOOL_NAME ? reply : "Unknown tool.",
          is_error: true,
        })),
    });
  }
  return null;
}

/** How the next two steps are shown what step 1 produced. The document is already in the last
 *  user message, which this is added to the end of. */
function formatClassification(c: Classification): string {
  return `[Step 1 set the task up.\n\nScenario: ${c.scenario}\n\nProblem statement: ${c.problemStatement}]`;
}

/** Step 2. Returns the last solution the model produced; `problems` is empty if it was clean.
 *  `notes` is anything the model said in words with no tool call. */
async function runSolve(run: DocumentBuildRun): Promise<{ solution: Solution | null; notes: string }> {
  const system = solveSystemPrompt();
  const messages: Anthropic.MessageParam[] = run.messages.slice();
  let last: Solution | null = null;
  let notes = "";
  let nudged = false;

  for (let round = 0; round < MAX_SOLVE_ROUNDS; round++) {
    if (run.signal?.aborted) break;
    const message = await ask(run, `Step 2: Solve, call ${round + 1}`, system, [SOLVE_PROBLEM_TOOL, SEARCH_TOOL], messages);

    // A cut-off answer can hold a half-written tool call, so it is never used.
    if (message.stop_reason === "max_tokens") {
      if (run.trace) run.emit({ type: "reply", text: CUT_OFF });
      messages.push({ role: "assistant", content: textOf(message) || "(continuing)" });
      messages.push({ role: "user", content: CUT_OFF });
      continue;
    }

    const uses = toolUses(message);
    messages.push({ role: "assistant", content: message.content });
    if (uses.length === 0) {
      notes = textOf(message);
      if (last || nudged) break;
      nudged = true;
      messages.push({ role: "user", content: `Call ${SOLVE_PROBLEM_TOOL_NAME} now. It is your only output. If the request needs no calculation, call it with an empty list.` });
      continue;
    }

    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const use of uses) {
      if (use.name === SOLVE_PROBLEM_TOOL_NAME) {
        last = await evaluateSolution(use.input as { steps?: unknown }, run.existingEquations);
        if (run.trace) run.emit({ type: "reply", text: last.text });
        results.push({ type: "tool_result", tool_use_id: use.id, content: last.text });
      } else if (use.name === SEARCH_TOOL_NAME) {
        let content: string;
        try {
          const found = await searchDocuments(run.userId, String((use.input as { query?: unknown }).query ?? ""));
          content = found.length > 0
            ? found.map((r) => `[Document: "${r.fileName}"] ${r.chunkText}`).join("\n\n")
            : "No relevant content found.";
        } catch (err) {
          content = `Search failed: ${err instanceof Error ? err.message : "unknown error"}`;
        }
        if (run.trace) run.emit({ type: "reply", text: `Document search:\n${content}` });
        results.push({ type: "tool_result", tool_use_id: use.id, content });
      } else {
        results.push({ type: "tool_result", tool_use_id: use.id, content: "Unknown tool.", is_error: true });
      }
    }
    messages.push({ role: "user", content: results });
    if (last && last.problems.length === 0) break;
  }
  return { solution: last, notes };
}

/** How the writing step introduces the solved steps. The closing "]" is added after the steps. */
const WRITE_LEAD =
  "[Step 2 is done. The mathematics for this request was solved by the platform's solver. These are the solved steps, in order. Write the blocks that go into the document around them, placing each step once as an equation block with its number.";

/** Step 2. Streams the model's words to the chat and sends the accepted blocks to the browser. */
async function runWrite(run: DocumentBuildRun, solution: Solution | null, notes: string): Promise<void> {
  const steps = solution?.steps ?? [];
  const system = writeSystemPrompt();

  const parts: string[] = [];
  if (steps.length > 0) {
    parts.push(WRITE_LEAD, formatSteps(steps));
    if (solution && solution.problems.length > 0) {
      parts.push(`Problems the solver still reports:\n${solution.problems.join("\n")}\nSay plainly in the document that these are unresolved. Do not present them as solved.`);
    }
    parts.push("]");
  } else {
    parts.push("[Step 2 found nothing to calculate for this request. Write whatever blocks it needs, or just answer in words.]");
  }
  if (notes.trim()) parts.push(`[Notes from step 2: ${notes.trim()}]`);

  const messages: Anthropic.MessageParam[] = appendToLast(run.messages, parts.join("\n\n"));
  const emitBlocks = (blocks: ProposedBlock[]) => {
    const stamp = Date.now();
    blocks.forEach((b, i) => run.emit({ type: "tool_use", id: `build-${stamp}-${i}`, name: b.name, input: b.input }));
  };

  let nudged = false;
  for (let round = 0; round < MAX_WRITE_ROUNDS; round++) {
    if (run.signal?.aborted) return;
    const message = await ask(run, `Step 3: Write, call ${round + 1}`, system, [WRITE_DOCUMENT_TOOL], messages, (text) => run.emit({ type: "text", text }));

    if (message.stop_reason === "max_tokens") {
      if (run.trace) run.emit({ type: "reply", text: CUT_OFF });
      messages.push({ role: "assistant", content: textOf(message) || "(continuing)" });
      messages.push({ role: "user", content: CUT_OFF });
      continue;
    }

    const uses = toolUses(message);
    messages.push({ role: "assistant", content: message.content });
    if (uses.length === 0) {
      // A plain answer is fine when there was nothing to calculate.
      if (steps.length === 0) return;
      if (nudged) break;
      nudged = true;
      messages.push({ role: "user", content: `Call ${WRITE_DOCUMENT_TOOL_NAME} now. It is your only output.` });
      continue;
    }

    const results: Anthropic.ToolResultBlockParam[] = [];
    let accepted: ProposedBlock[] | null = null;
    for (const use of uses) {
      if (use.name !== WRITE_DOCUMENT_TOOL_NAME) {
        results.push({ type: "tool_result", tool_use_id: use.id, content: "Unknown tool.", is_error: true });
        continue;
      }
      const draft = evaluateDocument(use.input as { blocks?: unknown }, steps);
      if (draft.problems.length === 0) accepted = draft.blocks;
      const reply = draft.problems.length
        ? `Problems:\n${draft.problems.join("\n")}\n\nFix them and call ${WRITE_DOCUMENT_TOOL_NAME} again with ALL the blocks.`
        : "No problems. The blocks are added.";
      if (run.trace) run.emit({ type: "reply", text: reply });
      results.push({ type: "tool_result", tool_use_id: use.id, content: reply });
    }
    if (accepted) {
      emitBlocks(accepted);
      return;
    }
    messages.push({ role: "user", content: results });
  }

  // The model could not produce a valid document. The solved equations are still right, so add
  // them with their reasons rather than lose the work, and say so.
  if (steps.length > 0) {
    run.emit({ type: "text", text: "\n\n*I couldn't write the full explanation, so I added the solved equations with a short reason for each.*" });
    emitBlocks(plainDocument(steps));
  }
}

/** Runs the three steps for one Build-mode message. */
export async function runDocumentBuild(input: DocumentBuildRun): Promise<void> {
  const classification = await runClassify(input);
  // The chat shows the problem statement, so the user can see what the task was taken to be.
  // The scenario is written to the later steps, not to the user, so it is not sent.
  if (classification) input.emit({ type: "understood", problem: classification.problemStatement });
  // Solve and Write both get the scenario and problem statement after the user's message.
  const run: DocumentBuildRun = classification
    ? { ...input, messages: appendToLast(input.messages, formatClassification(classification)) }
    : input;
  const { solution, notes } = await runSolve(run);
  if (solution && solution.steps.length > 0) {
    const n = solution.steps.length;
    const left = solution.problems.length;
    run.emit({
      type: "text",
      text: left === 0
        ? `*Solved ${n} equation${n === 1 ? "" : "s"}. Writing the document…*\n\n`
        : `*Solved ${n} equation${n === 1 ? "" : "s"}, with ${left} problem${left === 1 ? "" : "s"} left. Writing the document…*\n\n`,
    });
  }
  await runWrite(run, solution, notes);
}
