// Main coordinator: reads the top-level requirements document(s) in full and writes the root
// design document. Process steps 3, 5, 6 and 7 of PART_TREE_BUILD_PROCESS.md. Reference research (step 4)
// isn't built yet. The shared work (the passes, the documents, the tree items) is in coordinator.ts.
import { buildPartTreeGraphData } from "@/utils/partTreeGraph";
import { buildPartTreePageContext } from "@/utils/partTreeToText";
import { runCoordinator } from "./coordinator";
import { gatherRequirements, type RequirementsDocumentText } from "./gatherRequirements";
import type { AgentFn, AgentTask, AgentContext } from "./types";

const AGENT = "root-coordinator" as const;

function formatDocuments(documents: RequirementsDocumentText[]): string {
  if (documents.length === 0) return "(none — there is no requirements document directly under the part tree)";
  return documents.map((d) => `=== "${d.fileName}" ===\n${d.text}`).join("\n\n");
}

export const rootCoordinator: AgentFn = async (task: AgentTask, ctx: AgentContext) => {
  ctx.emit({ type: "agent_start", agent: AGENT, fileId: task.designDocumentId });

  const graph = await buildPartTreeGraphData(ctx.partTreeId);
  if (!graph) throw new Error("That id isn't a part tree.");

  // Requirements documents directly under the part tree. Ones deeper down belong to the
  // coordinators of those systems.
  const topLevelItems = graph.childrenMap.get(graph.rootItem.id) ?? [];
  const { documents, requirements, documentCount } = await gatherRequirements(topLevelItems, ctx.userId);
  ctx.emit({
    type: "notice",
    message: `Read ${documentCount} top-level requirements document${documentCount === 1 ? "" : "s"}, with ${requirements.length} flagged requirement${requirements.length === 1 ? "" : "s"}.`,
  });

  const structure = buildPartTreePageContext(
    graph.rootItem, graph.childrenMap, new Map(), new Map(), "", "", graph.importsByItemId,
  ).text;

  const context = [
    `Part tree: ${graph.rootItem.name}`,
    `Build request: ${ctx.prompt}`,
    "",
    "Requirements documents (full text; lines marked [requirement N] are flagged requirements, N is the id):",
    formatDocuments(documents),
    "",
    "Part tree as it exists now:",
    structure,
  ].join("\n");

  const result = await runCoordinator(
    {
      agent: AGENT,
      kind: "root",
      scopeId: ctx.partTreeId,
      scopeName: graph.rootItem.name,
      path: [graph.rootItem.name],
      context,
      requirements: requirements.map((r) => ({ id: r.componentId, source: r.fileName, kind: r.kind, text: r.summary })),
      above: null,
    },
    ctx,
  );
  ctx.emit({ type: "agent_done", agent: AGENT, fileId: result.designDocumentId });
  return result;
};
