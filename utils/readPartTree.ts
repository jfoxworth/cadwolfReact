import { checkPermission } from "./checkPermission";
import { buildPartTreeGraphData } from "./partTreeGraph";
import { buildPartTreePageContext } from "./partTreeToText";

/** Fetches a specific OTHER part tree's full structure (subsystems/parts/requirements docs,
 *  quantities, and cross-document import wiring) as text — the same kind of dump
 *  components/part-tree/PartTreeWrapper.tsx builds for the currently-open page, generalized to
 *  an arbitrary tree by id. Backs the AI chat's `read_part_tree` tool. Never throws — permission/
 *  not-found cases come back as a plain string the model can relay, same as utils/readDocument.ts. */
export async function readPartTreeForChat(rootId: number, userId: number): Promise<string> {
  const canView = await checkPermission(rootId, userId, "view");
  if (!canView) return "You don't have access to that part tree.";

  const graph = await buildPartTreeGraphData(rootId);
  if (!graph) return "That id isn't a part tree.";

  // No rollup values here — this is a structural/wiring comparison, not this tree's live numbers.
  const result = buildPartTreePageContext(
    graph.rootItem, graph.childrenMap, new Map(), new Map(), "", "", graph.importsByItemId,
  );
  return result.text;
}
