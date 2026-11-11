// System coordinator: one per system. Reads the design document one level above its location and
// the requirements documents of its own system, then runs the shared passes (coordinator.ts):
// it writes its own design document inside the system, creates the children and writes a design
// document for each part directly beneath it. Process steps 8-12 of PART_TREE_BUILD_PROCESS.md.
import { buildPartTreeGraphData } from "@/utils/partTreeGraph";
import { buildPartTreePageContext } from "@/utils/partTreeToText";
import { runCoordinator } from "./coordinator";
import { designText, readDesignDocument } from "./designDocumentFormat";
import { gatherRequirements, type RequirementsDocumentText } from "./gatherRequirements";
import type { RequirementInput } from "./designPasses";
import type { AgentContext, AgentFn, AgentTask } from "./types";

const AGENT = "system-coordinator" as const;
const lc = (s: string) => s.trim().toLowerCase();

function formatDocuments(documents: RequirementsDocumentText[]): string {
  if (documents.length === 0) return "(none — this system has no requirements documents of its own)";
  return documents.map((d) => `=== "${d.fileName}" ===\n${d.text}`).join("\n\n");
}

export const systemCoordinator: AgentFn = async (task: AgentTask, ctx: AgentContext) => {
  const systemId = task.targetId;
  if (systemId === undefined) throw new Error("A system coordinator needs the system it works for.");
  ctx.emit({ type: "agent_start", agent: AGENT, fileId: systemId });

  const graph = await buildPartTreeGraphData(ctx.partTreeId);
  if (!graph) throw new Error("That id isn't a part tree.");
  const system = graph.items.find((i) => i.id === String(systemId));
  if (!system) throw new Error(`System ${systemId} isn't in the part tree.`);

  // What it was handed: the design document one level above, and within it what applies to this
  // system.
  const parent = await readDesignDocument(task.designDocumentId);
  const mine = (node: string) => lc(node) === lc(system.name);
  const entry = parent.children.find((c) => mine(c.name));
  const inherited: RequirementInput[] = parent.requirements
    .filter((r) => r.scope === "all" || (r.scope === "children" && r.children.some(mine)))
    .map((r) => ({ id: r.id, source: r.source, kind: r.kind, text: r.text }));

  // Its own requirements documents, if any.
  const own = await gatherRequirements(graph.childrenMap.get(system.id) ?? [], ctx.userId);
  const requirements: RequirementInput[] = [
    ...inherited,
    ...own.requirements.map((r) => ({ id: r.componentId, source: r.fileName, kind: r.kind, text: r.summary })),
  ].filter((r, i, all) => all.findIndex((x) => x.id === r.id) === i);
  ctx.emit({
    type: "notice",
    message: `${system.name}: received ${inherited.length} requirement${inherited.length === 1 ? "" : "s"} from above; read ${own.documentCount} requirements document${own.documentCount === 1 ? "" : "s"} of its own, with ${own.requirements.length} flagged.`,
  });

  const above = {
    orientation: entry?.orientation ?? "",
    count: entry?.count ?? 1,
    siblings: parent.children.filter((c) => !mine(c.name)).map((c) => c.name),
    interfaces: parent.interfaces.find((i) => mine(i.node)) ?? null,
    given: parent.given.filter((n) => mine(n.node)),
    intent: parent.intent.filter((n) => mine(n.node)),
  };

  const structure = buildPartTreePageContext(
    system, graph.childrenMap, new Map(), new Map(), "", "", graph.importsByItemId,
  ).text;

  const context = [
    `System: ${system.name}`,
    `Where it sits: ${[...parent.path, system.name].join(" > ")}`,
    `Build request: ${ctx.prompt}`,
    "",
    `Design document one level above ("${parent.name}"), in full:`,
    designText(parent),
    "",
    "What that design hands to this system (its orientation, count, interfaces, given parameters and design intent):",
    entry
      ? JSON.stringify({ orientation: above.orientation, count: above.count, interfaces: above.interfaces, given: above.given, intent: above.intent }, null, 2)
      : "(nothing — this system is not listed there)",
    "",
    "This system's own requirements documents (full text; lines marked [requirement N] are flagged requirements):",
    formatDocuments(own.documents),
    "",
    "This system as it exists now:",
    structure,
  ].join("\n");

  const result = await runCoordinator(
    {
      agent: AGENT,
      kind: "system",
      scopeId: systemId,
      scopeName: system.name,
      path: [...parent.path, system.name],
      context,
      requirements,
      above,
    },
    ctx,
  );
  ctx.emit({ type: "agent_done", agent: AGENT, fileId: result.designDocumentId });
  return result;
};
