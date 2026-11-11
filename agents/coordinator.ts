// What the main coordinator and every system coordinator share: five focused passes over the same
// material (structure, requirements, interfaces, details, orientation), then the writing of that
// location's design document, the creation of its children, and a design document for each child
// that is a part. The callers (rootCoordinator.ts, systemCoordinator.ts) only differ in what they
// read. The passes and their checks are in designPasses.ts.
import { readFileSync } from "fs";
import { join } from "path";
import type Anthropic from "@anthropic-ai/sdk";
import { anthropicClient } from "@/utils/anthropicClient";
import { resolveModelId } from "@/utils/aiModels";
import { createTreeItem } from "./createTreeItem";
import { designBlocks, type DesignChild, type DesignData, type DesignInterface, type DesignNote } from "./designDocumentFormat";
import {
  DETAILS_TOOL, INTERFACES_TOOL, REQUIREMENTS_TOOL, STRUCTURE_TOOL, cleanAssignments, cleanInterfaces,
  cleanNotes, cleanQuestions, cleanStructure, orientationTool,
  type DetailsAnswer, type InterfacesAnswer, type OrientationAnswer, type PassName, type RequirementInput,
  type RequirementsAnswer, type StructureAnswer,
} from "./designPasses";
import { writeDesignDocument } from "./writeDesignDocument";
import type { AgentContext, AgentKind, AgentResult, ChildRef } from "./types";

/** What a system was handed by the design above it. */
export interface DesignAbove {
  orientation: string;
  count: number;
  siblings: string[];
  interfaces: DesignInterface | null;
  given: DesignNote[];
  intent: DesignNote[];
}

export interface CoordinatorRun {
  agent: Extract<AgentKind, "root-coordinator" | "system-coordinator">;
  kind: "root" | "system";
  /** The part tree or system this coordinator works for. Its design document lives inside it. */
  scopeId: number;
  scopeName: string;
  /** Names from the part tree down to this scope, inclusive. */
  path: string[];
  /** Everything the passes read: the build request, the documents, the design above, the
   *  structure as it exists. The requirements to assign are added to it. */
  context: string;
  /** Every requirement the passes may cite: the ones handed down plus the ones in this
   *  location's own requirements documents. */
  requirements: RequirementInput[];
  /** Null for the root, which has nothing above it. */
  above: DesignAbove | null;
}

const MAX_TOKENS = 16000;
const lc = (s: string) => s.trim().toLowerCase();

function loadPrompt(pass: PassName): string {
  const dir = join(process.cwd(), "prompts", "agents");
  return `${readFileSync(join(dir, "coordinator.md"), "utf-8")}\n\n${readFileSync(join(dir, "passes", `${pass}.md`), "utf-8")}`;
}

/** One model call for one pass. One retry if the model answers in prose instead of calling the
 *  tool. tool_choice stays on auto: forcing a tool is rejected by some of the current models. */
async function callTool<T>(
  ctx: AgentContext, label: string, system: string, tool: Anthropic.Tool, userMessage: string,
): Promise<T> {
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userMessage }];
  let stopReason: string | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const stream = anthropicClient.messages.stream(
      {
        model: resolveModelId(ctx.modelKey),
        max_tokens: MAX_TOKENS,
        output_config: { effort: ctx.effortKey },
        system,
        tools: [tool],
        messages,
      } as Parameters<typeof anthropicClient.messages.stream>[0],
      { signal: ctx.signal },
    );
    const message = await stream.finalMessage();
    stopReason = message.stop_reason;
    // A cut-off answer can still contain a half-written tool call; never use it.
    if (stopReason === "max_tokens") {
      throw new Error(`${label}: the model's answer was cut off at ${MAX_TOKENS} tokens.`);
    }
    const toolUse = message.content.find(
      (b): b is Extract<typeof b, { type: "tool_use" }> => b.type === "tool_use" && b.name === tool.name,
    );
    if (toolUse) return toolUse.input as T;

    messages.push({ role: "assistant", content: message.content });
    messages.push({ role: "user", content: `Call ${tool.name} now. It is your only output.` });
  }
  throw new Error(`${label}: the model did not call ${tool.name} (stopped: ${stopReason ?? "unknown"}).`);
}

function decided(sections: [string, unknown][]): string {
  return sections.map(([title, value]) => `## ${title}\n${JSON.stringify(value, null, 2)}`).join("\n\n");
}

function requirementList(requirements: RequirementInput[]): string {
  if (requirements.length === 0) return "(none)";
  return requirements
    .map((r) => `- [requirement ${r.id}] ${r.text.replace(/\s*\n\s*/g, " ")}${r.source ? ` (from "${r.source}")` : ""}`)
    .join("\n");
}

/** Runs one coordinator from the first pass to the last file written. */
export async function runCoordinator(run: CoordinatorRun, ctx: AgentContext): Promise<AgentResult> {
  const scope = run.scopeName;
  const notices: string[] = [];
  const base = `${run.context}\n\n# Requirements to assign (N is the id)\n${requirementList(run.requirements)}`;

  const ask = async <T,>(pass: PassName, tool: Anthropic.Tool, earlier: [string, unknown][]): Promise<T> => {
    ctx.emit({ type: "notice", message: `${scope}: ${pass} pass…` });
    const message = [base, earlier.length ? `# Decided so far\n${decided(earlier)}` : "", `Do the ${pass} pass now.`]
      .filter(Boolean).join("\n\n");
    return callTool<T>(ctx, `${scope} (${pass})`, loadPrompt(pass), tool, message);
  };

  // 1. Structure: only which systems and parts exist directly beneath.
  const structureAnswer = await ask<StructureAnswer>("structure", STRUCTURE_TOOL, []);
  const children: DesignChild[] = cleanStructure(structureAnswer);
  const listed = children.map(({ name, kind, count, purpose }) => ({ name, kind, count, purpose }));

  let assigned = cleanAssignments({ assignments: [] }, run.requirements, children, []);
  let interfaces: DesignInterface[] = [];
  let given: DesignNote[] = [];
  let intent: DesignNote[] = [];
  let questions = cleanQuestions(structureAnswer.openQuestions);
  let ownOrientation = run.above?.orientation ?? "";

  if (children.length === 0) {
    // Nothing beneath: every requirement stays with this system.
    assigned = assigned.map((r) => ({ ...r, scope: "system" as const, children: [] }));
    notices.push("The passes found no systems or parts beneath it.");
  } else {
    // 2. Requirements: who each one applies to.
    const reqAnswer = await ask<RequirementsAnswer>("requirements", REQUIREMENTS_TOOL, [["Structure", listed]]);
    assigned = cleanAssignments(reqAnswer, run.requirements, children, notices);
    questions = cleanQuestions(questions, reqAnswer.openQuestions);

    // 3. Interfaces: what each child needs and gives.
    const ifaceAnswer = await ask<InterfacesAnswer>("interfaces", INTERFACES_TOOL, [
      ["Structure", listed], ["Requirement assignments", assigned],
    ]);
    interfaces = cleanInterfaces(ifaceAnswer, children, notices);
    questions = cleanQuestions(questions, ifaceAnswer.openQuestions);

    // 4. Details: the given parameters and the design intent the documents state.
    const detailsAnswer = await ask<DetailsAnswer>("details", DETAILS_TOOL, [
      ["Structure", listed], ["Requirement assignments", assigned], ["Interfaces", interfaces],
    ]);
    given = cleanNotes(detailsAnswer.given, children, scope);
    intent = cleanNotes(detailsAnswer.intent, children, scope);
    questions = cleanQuestions(questions, detailsAnswer.openQuestions);

    // 5. Orientation: prose for the agent that picks each document up.
    const orientAnswer = await ask<OrientationAnswer>("orientation", orientationTool(run.kind === "root"), [
      ["Structure", listed], ["Requirement assignments", assigned], ["Interfaces", interfaces],
      ["Given parameters", given], ["Design intent", intent],
    ]);
    for (const c of orientAnswer.children ?? []) {
      const child = children.find((x) => lc(x.name) === lc(String(c?.name ?? "")));
      if (child && typeof c.text === "string") child.orientation = c.text.trim();
    }
    if (run.kind === "root" && typeof orientAnswer.system === "string") ownOrientation = orientAnswer.system.trim();
    const blank = children.filter((c) => !c.orientation).map((c) => c.name);
    if (blank.length) notices.push(`No orientation was written for: ${blank.join(", ")}.`);
  }

  notices.forEach((message) => ctx.emit({ type: "notice", message: `${scope}: ${message}` }));

  // Own interface, given parameters and design intent were handed down from above; they are
  // carried into this document so it can be read on its own.
  const self = (n: { node: string }) => ({ ...n, node: scope });
  const data: DesignData = {
    name: scope,
    kind: run.kind,
    path: run.path,
    count: run.above?.count ?? 1,
    siblings: run.above?.siblings ?? [],
    children,
    orientation: ownOrientation,
    requirements: assigned,
    interfaces: [...(run.above?.interfaces ? [self(run.above.interfaces)] : []), ...interfaces] as DesignInterface[],
    given: [...(run.above?.given ?? []).map(self), ...given] as DesignNote[],
    intent: [...(run.above?.intent ?? []).map(self), ...intent] as DesignNote[],
    openQuestions: questions,
  };

  const name = `Design: ${scope}`;
  const written = await writeDesignDocument({
    userId: ctx.userId, parentId: run.scopeId, designFor: run.scopeId, name, blocks: designBlocks(data),
  });
  ctx.emit({ type: "design_document", agent: run.agent, fileId: written.fileId, slug: written.slug, name, replaced: written.replaced });

  // The systems and parts directly beneath. Existing ones are kept as they are, with their own
  // kind. A part gets its design document now, next to it; a system's is written by that
  // system's own coordinator, which reads this document.
  const refs: ChildRef[] = [];
  for (const child of children) {
    const item = await createTreeItem({
      userId: ctx.userId, parentId: run.scopeId, kind: child.kind, name: child.name,
    });
    if (item.kind !== child.kind) {
      ctx.emit({ type: "notice", message: `${scope}: "${child.name}" already exists as a ${item.kind}; kept as a ${item.kind}.` });
    }
    ctx.emit({ type: "item", kind: item.kind, name: child.name, fileId: item.fileId, created: item.created });

    if (item.kind === "system") {
      refs.push({ kind: "system", fileId: item.fileId, name: child.name });
      continue;
    }
    const partData: DesignData = {
      name: child.name,
      kind: "part",
      path: [...run.path, child.name],
      count: child.count,
      siblings: children.filter((c) => c !== child).map((c) => c.name),
      children: [],
      orientation: child.orientation,
      requirements: assigned.filter(
        (r) => r.scope === "all" || (r.scope === "children" && r.children.some((n) => lc(n) === lc(child.name))),
      ),
      interfaces: interfaces.filter((i) => lc(i.node) === lc(child.name)),
      given: given.filter((n) => lc(n.node) === lc(child.name)),
      intent: intent.filter((n) => lc(n.node) === lc(child.name)),
      openQuestions: [],
    };
    const partName = `Design: ${child.name}`;
    const partDoc = await writeDesignDocument({
      userId: ctx.userId, parentId: run.scopeId, designFor: item.fileId, name: partName, blocks: designBlocks(partData),
    });
    ctx.emit({ type: "design_document", agent: run.agent, fileId: partDoc.fileId, slug: partDoc.slug, name: partName, replaced: partDoc.replaced });
    refs.push({ kind: "part", fileId: item.fileId, name: child.name, designDocumentId: partDoc.fileId });
  }

  return { designDocumentId: written.fileId, children: refs };
}
