// Part agent: one per part. Reads the part's design document, works out the design, then writes
// the part's real document (process step 13 of PART_TREE_BUILD_PROCESS.md). Two stages, so each
// can be checked on its own terms:
//
//   1. Calculation (prompts/agents/part-calculation.md + the platform reference). The agent
//      proposes the equations, each with a role and the reason for it. They are solved here, on the
//      server, and sent back with any errors, failed checks and impossible values until they are
//      clean or the rounds run out.
//   2. Document (prompts/agents/part-document.md). A separate call writes the document a person
//      reads: headings and text explaining the design and how it was reached. It places each
//      solved equation by step number, so it cannot change one; code checks every step appears
//      once, in order.
//
// Nothing is saved until stage 2 is done. If stage 2 can't produce a valid document, a plain
// one is built from the steps and their reasons, and the build says so.
import { readFileSync } from "fs";
import { join } from "path";
import type Anthropic from "@anthropic-ai/sdk";
import { anthropicClient } from "@/utils/anthropicClient";
import { resolveModelId } from "@/utils/aiModels";
import { db } from "@/utils/db";
import { getSolvedDocumentVariables } from "@/utils/getSolvedDocumentVariables";
import { isDesignDocument } from "./designDocument";
import { designText, readDesignDocument } from "./designDocumentFormat";
import {
  LOOKUP_MATERIAL_TOOL, LOOKUP_MATERIAL_TOOL_NAME, STEP_ROLES, WRITE_CALCULATION_TOOL, WRITE_CALCULATION_TOOL_NAME,
  WRITE_DOCUMENT_TOOL, WRITE_DOCUMENT_TOOL_NAME, lookupMaterial,
  type StepRole, type WriteCalculationInput, type WriteDocumentInput,
} from "./partAgentTools";
import { solvePartEquations, type SolvedEquation } from "./solvePartDocument";
import { textToHtml, type DesignBlock } from "./writeDesignDocument";
import { partDocumentIsWritable, writePartDocument, type PartImportRow } from "./writePartDocument";
import type { AgentContext, AgentFn, AgentTask } from "./types";

const AGENT = "part-agent" as const;
const MAX_CALCULATION_ROUNDS = 6;
const MAX_DOCUMENT_ROUNDS = 3;
const MAX_STEPS = 80;
const MAX_BLOCKS = 200;
const MAX_TOKENS = 16000;
const ALIAS = /^[A-Za-z][A-Za-z0-9_]*$/;

interface ImportOption {
  sourceFileId: number;
  sourceFileName: string;
  name: string;
  value: number;
  units: string | null;
  note: string;
}

interface Step {
  /** 1-based, as the model sees it. */
  number: number;
  raw: string;
  role: StepRole;
  why: string;
  positive: boolean;
  solved: SolvedEquation;
}

interface Calculation {
  steps: Step[];
  imports: PartImportRow[];
  /** What is still wrong: solve errors, failed checks, impossible values. Empty when accepted. */
  problems: string[];
  /** What the model is told after a round. */
  text: string;
}

function isPlainPart(itemData: string | null): boolean {
  if (isDesignDocument(itemData)) return false;
  try {
    return (JSON.parse(itemData || "{}") as { isAnalysis?: unknown }).isAnalysis !== true;
  } catch {
    return true;
  }
}

/** What this part may import: the equation requirements that apply to it, from the documents
 *  they were written in, and everything solved in the parts already built beside it. */
async function importOptions(
  requirements: { componentId: number; kind: string; summary: string }[],
  partId: number,
  parentId: number | null,
): Promise<ImportOption[]> {
  const options: ImportOption[] = [];

  const equations = requirements.filter((r) => r.kind === "equation");
  const sources = await db.component.findMany({
    where: { id: { in: equations.map((r) => r.componentId) } },
    select: { id: true, fileId: true },
  });
  const fileByComponent = new Map(sources.map((c) => [c.id, c.fileId]));
  const namesByFile = new Map<number, Map<string, number>>();
  for (const r of equations) {
    const fileId = fileByComponent.get(r.componentId);
    const name = r.summary.split("=")[0]?.trim();
    if (fileId === undefined || !name) continue;
    if (!namesByFile.has(fileId)) namesByFile.set(fileId, new Map());
    namesByFile.get(fileId)!.set(name, r.componentId);
  }
  for (const [fileId, names] of namesByFile) {
    const { name: fileName, variables } = await getSolvedDocumentVariables(fileId);
    for (const v of variables) {
      const requirementId = names.get(v.name);
      if (requirementId === undefined || v.value === undefined) continue;
      options.push({
        sourceFileId: fileId, sourceFileName: fileName, name: v.name, value: v.value, units: v.units ?? null,
        note: `requirement ${requirementId}`,
      });
    }
  }

  if (parentId !== null) {
    const siblings = await db.file.findMany({
      where: { parentId, deletedAt: null, fileTypeId: "Document", id: { not: partId } },
      select: { id: true, name: true, itemData: true },
      orderBy: { order: "asc" },
    });
    for (const s of siblings.filter((x) => isPlainPart(x.itemData))) {
      const { variables } = await getSolvedDocumentVariables(s.id);
      for (const v of variables) {
        if (v.value === undefined) continue;
        options.push({
          sourceFileId: s.id, sourceFileName: s.name, name: v.name, value: v.value, units: v.units ?? null,
          note: `part "${s.name}"`,
        });
      }
    }
  }
  return options;
}

function formatOptions(options: ImportOption[]): string {
  if (options.length === 0) return "(none)";
  return options
    .map((o) => `- source id ${o.sourceFileId}, name ${o.name} = ${o.value}${o.units ? " " + o.units : ""} (${o.note}, in "${o.sourceFileName}")`)
    .join("\n");
}

const nameOf = (raw: string) => raw.split("=")[0]?.trim() ?? raw;

function scalarOf(solved: SolvedEquation): number | undefined {
  return solved.solution?.size === "1x1" ? solved.solution.real["0-0"] : undefined;
}

/** Turns the model's proposal into solved steps and reports everything still wrong with it:
 *  imports that aren't on the list, equations that don't solve, checks that fail, and values
 *  that the model itself said must be positive and aren't. */
async function evaluateCalculation(input: WriteCalculationInput, options: ImportOption[]): Promise<Calculation> {
  const problems: string[] = [];

  const imports: PartImportRow[] = [];
  const aliases = new Set<string>();
  for (const imp of Array.isArray(input.imports) ? input.imports : []) {
    const option = options.find((o) => o.sourceFileId === imp.sourceFileId && o.name === imp.sourceVariableName);
    if (!option) {
      problems.push(`Import dropped: source ${imp.sourceFileId} has no variable "${imp.sourceVariableName}" in the available list.`);
      continue;
    }
    const alias = (imp.localAlias || option.name).trim();
    if (!ALIAS.test(alias) || aliases.has(alias)) {
      problems.push(`Import dropped: "${alias}" is not a valid or unique name.`);
      continue;
    }
    aliases.add(alias);
    imports.push({
      sourceFileId: option.sourceFileId, sourceFileName: option.sourceFileName, sourceVariableName: option.name,
      localAlias: alias, value: option.value, units: option.units,
    });
  }

  const proposed: { raw: string; role: StepRole; why: string; positive: boolean }[] = [];
  for (const s of Array.isArray(input.steps) ? input.steps.slice(0, MAX_STEPS) : []) {
    const raw = typeof s?.raw === "string" ? s.raw.trim() : "";
    if (!raw.includes("=")) {
      problems.push(`A step was skipped because it is not an equation: "${raw}".`);
      continue;
    }
    proposed.push({
      raw,
      role: STEP_ROLES.includes(s.role) ? s.role : "calculation",
      why: typeof s.why === "string" ? s.why.trim() : "",
      positive: s.positive === true,
    });
  }
  if (proposed.length === 0) problems.push("The calculation has no equations. A part must calculate something.");

  const solved = proposed.length
    ? await solvePartEquations(
        proposed.map((s, i) => ({ index: i, raw: s.raw })),
        imports.map((i) => ({ localAlias: i.localAlias, value: i.value, units: i.units })),
      )
    : [];

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
        problems.push(`Step ${step.number}: the check "${name}" fails. The design does not meet it. Change the design (a choice or a size) until it passes. Do not weaken the check.`);
      }
    }
    if (step.positive && value !== undefined && !(value > 0)) {
      problems.push(`Step ${step.number}: "${name}" is ${step.solved.summary}, but it must be greater than zero. Find out why and fix the design.`);
    }
  }

  const text = [
    steps.length ? "Results:\n" + steps.map((s) => `step ${s.number} [${s.role}] ${s.raw} → ${s.solved.summary}`).join("\n") : "",
    problems.length
      ? `Problems:\n${problems.join("\n")}\n\n${problems.length} problem${problems.length === 1 ? "" : "s"}. Fix them and call ${WRITE_CALCULATION_TOOL_NAME} again with the whole calculation.`
      : "No problems. The calculation is accepted.",
  ].filter(Boolean).join("\n\n");

  return { steps, imports, problems, text };
}

/** One model call. A cut-off answer can hold a half-written tool call, so it is never used. */
async function ask(
  ctx: AgentContext, label: string, system: string, tools: Anthropic.Tool[], messages: Anthropic.MessageParam[],
): Promise<Anthropic.Message> {
  const stream = anthropicClient.messages.stream(
    {
      model: resolveModelId(ctx.modelKey),
      max_tokens: MAX_TOKENS,
      output_config: { effort: ctx.effortKey },
      system,
      tools,
      messages,
    } as Parameters<typeof anthropicClient.messages.stream>[0],
    { signal: ctx.signal },
  );
  const message = await stream.finalMessage();
  if (message.stop_reason === "max_tokens") {
    throw new Error(`${label}: the model's answer was cut off at ${MAX_TOKENS} tokens.`);
  }
  return message;
}

function toolUses(message: Anthropic.Message): Extract<Anthropic.ContentBlock, { type: "tool_use" }>[] {
  return message.content.filter((b): b is Extract<Anthropic.ContentBlock, { type: "tool_use" }> => b.type === "tool_use");
}

function readPrompt(file: string): string {
  return readFileSync(join(process.cwd(), "prompts", "agents", file), "utf-8");
}

function calculationPrompt(): string {
  const reference = readFileSync(join(process.cwd(), "prompts", "document.md"), "utf-8");
  // The chat assistant's behaviour sections (modes, proposing changes) don't apply here.
  const platform = reference.split("\n## Modes")[0];
  return `${readPrompt("part-calculation.md")}\n\n# Platform reference\n\n${platform}`;
}

/** Stage 1. Returns the last calculation the model produced; `problems` is empty if it was clean. */
async function runCalculation(
  ctx: AgentContext, partName: string, userMessage: string, options: ImportOption[],
): Promise<Calculation | null> {
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userMessage }];
  const system = calculationPrompt();
  let last: Calculation | null = null;
  let nudged = false;

  for (let round = 0; round < MAX_CALCULATION_ROUNDS; round++) {
    if (ctx.signal.aborted) return last;
    const message = await ask(ctx, `${partName} (calculation)`, system, [WRITE_CALCULATION_TOOL, LOOKUP_MATERIAL_TOOL], messages);
    const uses = toolUses(message);

    messages.push({ role: "assistant", content: message.content });
    if (uses.length === 0) {
      if (nudged) break;
      nudged = true;
      messages.push({ role: "user", content: `Call ${WRITE_CALCULATION_TOOL_NAME} now. It is your only output.` });
      continue;
    }

    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const use of uses) {
      if (use.name === LOOKUP_MATERIAL_TOOL_NAME) {
        results.push({ type: "tool_result", tool_use_id: use.id, content: lookupMaterial(String((use.input as { query?: unknown }).query ?? "")) });
      } else if (use.name === WRITE_CALCULATION_TOOL_NAME) {
        last = await evaluateCalculation(use.input as WriteCalculationInput, options);
        results.push({ type: "tool_result", tool_use_id: use.id, content: last.text });
      } else {
        results.push({ type: "tool_result", tool_use_id: use.id, content: "Unknown tool.", is_error: true });
      }
    }
    messages.push({ role: "user", content: results });
    if (last && last.problems.length === 0) return last;
  }
  return last;
}

function formatSteps(calc: Calculation): string {
  return calc.steps
    .map((s) => `[step ${s.number}] ${s.role}: ${s.raw}\n  result: ${s.solved.summary}\n  why: ${s.why}`)
    .join("\n");
}

/** Builds the document from the model's blocks and reports what is wrong with it: every step
 *  must appear once, in order, so the equations can't be changed or lost. */
function evaluateDocument(input: WriteDocumentInput, calc: Calculation): { blocks: DesignBlock[]; problems: string[] } {
  const problems: string[] = [];
  const blocks: DesignBlock[] = [];
  const used: number[] = [];
  let texts = 0;

  for (const b of Array.isArray(input.blocks) ? input.blocks.slice(0, MAX_BLOCKS) : []) {
    if (b.type === "header" && b.text?.trim()) {
      blocks.push({ type: "header", text: b.text.trim(), level: Math.min(Math.max(Math.round(b.level ?? 2), 1), 4) as 1 | 2 | 3 | 4 });
    } else if (b.type === "text" && b.text?.trim()) {
      texts++;
      blocks.push({ type: "text", html: textToHtml(b.text) });
    } else if (b.type === "equation") {
      const n = Number(b.step);
      const step = calc.steps.find((s) => s.number === n);
      if (!step) problems.push(`An equation block refers to step ${b.step}, which does not exist.`);
      else if (used.includes(n)) problems.push(`Step ${n} is placed more than once.`);
      else if (used.length && n < used[used.length - 1]) problems.push(`Step ${n} is placed after step ${used[used.length - 1]}. Keep the steps in their numbered order.`);
      else {
        used.push(n);
        blocks.push({ type: "equation", content: { raw: step.raw, ...(step.solved.solution ? { solution: step.solved.solution } : {}) } });
      }
    } else {
      problems.push(`A ${b.type ?? "unknown"} block was skipped because it was empty or malformed.`);
    }
  }
  const missing = calc.steps.filter((s) => !used.includes(s.number)).map((s) => s.number);
  if (missing.length) problems.push(`These steps are not in the document: ${missing.join(", ")}. Every step must appear once.`);
  if (texts === 0) problems.push("The document has no text. It must explain the design.");
  return { blocks, problems };
}

/** What the writing stage falls back to: the part's name, then each step's reason and equation.
 *  Plain, but correct. */
function plainDocument(partName: string, calc: Calculation): DesignBlock[] {
  const blocks: DesignBlock[] = [{ type: "header", text: partName, level: 1 }];
  for (const s of calc.steps) {
    blocks.push({ type: "text", html: textToHtml(s.why || nameOf(s.raw)) });
    blocks.push({ type: "equation", content: { raw: s.raw, ...(s.solved.solution ? { solution: s.solved.solution } : {}) } });
  }
  return blocks;
}

/** Stage 2. Returns the blocks, and whether the model's own document was used. */
async function runDocument(
  ctx: AgentContext, partName: string, userMessage: string, calc: Calculation,
): Promise<{ blocks: DesignBlock[]; written: boolean }> {
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userMessage }];
  const system = readPrompt("part-document.md");
  let nudged = false;

  for (let round = 0; round < MAX_DOCUMENT_ROUNDS; round++) {
    if (ctx.signal.aborted) break;
    const message = await ask(ctx, `${partName} (document)`, system, [WRITE_DOCUMENT_TOOL], messages);
    const uses = toolUses(message);

    messages.push({ role: "assistant", content: message.content });
    if (uses.length === 0) {
      if (nudged) break;
      nudged = true;
      messages.push({ role: "user", content: `Call ${WRITE_DOCUMENT_TOOL_NAME} now. It is your only output.` });
      continue;
    }

    const results: Anthropic.ToolResultBlockParam[] = [];
    let accepted: DesignBlock[] | null = null;
    for (const use of uses) {
      if (use.name !== WRITE_DOCUMENT_TOOL_NAME) {
        results.push({ type: "tool_result", tool_use_id: use.id, content: "Unknown tool.", is_error: true });
        continue;
      }
      const draft = evaluateDocument(use.input as WriteDocumentInput, calc);
      if (draft.problems.length === 0) accepted = draft.blocks;
      results.push({
        type: "tool_result",
        tool_use_id: use.id,
        content: draft.problems.length
          ? `Problems:\n${draft.problems.join("\n")}\n\nFix them and call ${WRITE_DOCUMENT_TOOL_NAME} again with the whole document.`
          : "No problems. The document is saved.",
      });
    }
    if (accepted) return { blocks: accepted, written: true };
    messages.push({ role: "user", content: results });
  }
  return { blocks: plainDocument(partName, calc), written: false };
}

export const partAgent: AgentFn = async (task: AgentTask, ctx: AgentContext) => {
  const partId = task.targetId;
  if (partId === undefined) throw new Error("A part agent needs the part it works for.");
  ctx.emit({ type: "agent_start", agent: AGENT, fileId: partId });

  const part = await db.file.findUnique({ where: { id: partId }, select: { name: true, parentId: true } });
  if (!part) throw new Error(`Part ${partId} doesn't exist.`);

  if (!(await partDocumentIsWritable(partId))) {
    ctx.emit({ type: "notice", message: `${part.name}: it already has content that was not written by the build, so it was left as it is.` });
    ctx.emit({ type: "agent_done", agent: AGENT, fileId: partId });
    return;
  }

  const design = await readDesignDocument(task.designDocumentId);
  const options = await importOptions(
    design.requirements.map((r) => ({ componentId: r.id, kind: r.kind, summary: r.text })),
    partId,
    part.parentId,
  );
  const container = part.parentId
    ? await db.file.findUnique({ where: { id: part.parentId }, select: { name: true } })
    : null;

  const header = [
    `Part: ${part.name}`,
    container ? `Contained in: ${container.name}` : null,
    `Build request: ${ctx.prompt}`,
    "",
    `Design document for this part ("Design: ${design.name}"), in full. Read the Orientation first; the other sections are structured data:`,
    designText(design),
  ].filter((l): l is string => l !== null);

  // Stage 1: the calculation.
  ctx.emit({ type: "notice", message: `${part.name}: calculation…` });
  const calc = await runCalculation(
    ctx,
    part.name,
    [...header, "", "Available imports (use `imports` with the source id and name exactly as listed):", formatOptions(options)].join("\n"),
    options,
  );
  if (!calc || calc.steps.length === 0) {
    throw new Error(`The part agent did not return a calculation for "${part.name}".`);
  }
  ctx.emit({
    type: "notice",
    message: calc.problems.length === 0
      ? `${part.name}: calculation solved (${calc.steps.length} steps).`
      : `${part.name}: calculation has ${calc.problems.length} unresolved problem${calc.problems.length === 1 ? "" : "s"}: ${calc.problems.slice(0, 3).join(" | ")}`,
  });

  // Stage 2: the document.
  ctx.emit({ type: "notice", message: `${part.name}: writing the document…` });
  const imported = calc.imports.length
    ? calc.imports.map((i) => `- ${i.localAlias} = ${i.value}${i.units ? " " + i.units : ""} (from "${i.sourceFileName}", ${i.sourceVariableName})`).join("\n")
    : "(none)";
  const document = await runDocument(
    ctx,
    part.name,
    [
      ...header,
      "",
      "Values imported from elsewhere:",
      imported,
      "",
      "The solved calculation, in order. Place each step once, as an equation block, by its number:",
      formatSteps(calc),
      calc.problems.length
        ? `\nUnresolved problems with this calculation. State them plainly in the document:\n${calc.problems.join("\n")}`
        : "",
    ].join("\n"),
    calc,
  );
  if (!document.written) {
    ctx.emit({ type: "notice", message: `${part.name}: the writing stage did not produce a valid document, so a plain one was built from the steps and their reasons.` });
  }

  await writePartDocument({ fileId: partId, blocks: document.blocks, imports: calc.imports });
  ctx.emit({
    type: "notice",
    message: `${part.name}: document written (${document.blocks.length} blocks, ${calc.imports.length} imports${calc.problems.length ? `, ${calc.problems.length} unresolved problem${calc.problems.length === 1 ? "" : "s"}` : ""}).`,
  });
  ctx.emit({ type: "agent_done", agent: AGENT, fileId: partId });
};
