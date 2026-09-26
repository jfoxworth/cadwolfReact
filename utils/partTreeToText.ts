import type { Item } from "@/types/item";
import { PAGE_CONTEXT_CHAR_BUDGET, truncateLinesToBudget, type PageContextResult } from "./blockToText";

interface EqValue {
  value: number | null;
  unit: string | null;
}

/** One declared cross-document variable import — the same shape FileImport rows have
 *  (prisma/schema.prisma), minus id/timestamps, which this file doesn't otherwise depend on
 *  Prisma's generated types for. */
export interface ImportEdge {
  localAlias: string;
  sourceVariableName: string;
  sourceFileName: string;
  sourceFileId: number;
}

/** Formats one item's declared imports as a single clause, e.g. `imports loadLimit (as
 *  L_limit) from "Strut Load Requirements" (id 91); imports ...` — exported so the selected-item
 *  chip (PartTreeWrapper.tsx) can reuse the exact same formatting as the tree dump. */
export function importsClause(item: Item, importsByItemId: Map<string, ImportEdge[]>): string | null {
  const edges = importsByItemId.get(item.id);
  if (!edges || edges.length === 0) return null;
  return edges
    .map((e) => {
      const asAlias = e.localAlias && e.localAlias !== e.sourceVariableName ? ` (as ${e.localAlias})` : "";
      return `imports ${e.sourceVariableName}${asAlias} from "${e.sourceFileName}" (id ${e.sourceFileId})`;
    })
    .join("; ");
}

/** "Part" / "Subsystem" / "Requirements Document" for a part-tree item — the vocabulary used
 *  throughout the AI chat (page context, selection chip, tool descriptions) instead of the raw
 *  ItemType/fileTypeId strings, which don't distinguish a requirements document from a part. */
export function itemTypeLabel(item: Item): string {
  if (item.type === "WORKSPACE") return "Subsystem";
  if (item.type === "DOCUMENT") return item.isAnalysis ? "Requirements Document" : "Part";
  return item.type;
}

function itemLine(
  item: Item,
  displayValues: Map<string, EqValue>,
  cadDisplayValues: Map<string, EqValue>,
  valueToSumLabel: string,
  cadValueLabel: string,
  importsByItemId: Map<string, ImportEdge[]>,
): string {
  const parts = [`${itemTypeLabel(item)}: ${item.name} (id ${item.id}`];
  if (item.quantity != null) parts[0] += `, qty ${item.quantity}`;
  parts[0] += ")";
  if (valueToSumLabel) {
    const dv = displayValues.get(item.id);
    if (dv?.value != null) parts.push(`${valueToSumLabel}: ${dv.value}${dv.unit ? ` ${dv.unit}` : ""}`);
  }
  if (cadValueLabel) {
    const cv = cadDisplayValues.get(item.id);
    if (cv?.value != null) parts.push(`${cadValueLabel}: ${cv.value}${cv.unit ? ` ${cv.unit}` : ""}`);
  }
  const imports = importsClause(item, importsByItemId);
  if (imports) parts.push(imports);
  return parts.join(" — ");
}

function walk(
  item: Item,
  childrenMap: Map<string, Item[]>,
  depth: number,
  displayValues: Map<string, EqValue>,
  cadDisplayValues: Map<string, EqValue>,
  valueToSumLabel: string,
  cadValueLabel: string,
  importsByItemId: Map<string, ImportEdge[]>,
  out: string[],
): void {
  const indent = "  ".repeat(depth);
  out.push(`${indent}${itemLine(item, displayValues, cadDisplayValues, valueToSumLabel, cadValueLabel, importsByItemId)}`);
  for (const child of childrenMap.get(item.id) ?? []) {
    walk(child, childrenMap, depth + 1, displayValues, cadDisplayValues, valueToSumLabel, cadValueLabel, importsByItemId, out);
  }
}

/** Builds the AI chat's page-context dump for a part tree: an indented, depth-first tree of
 *  every subsystem/part/requirements document with its real id (required so the model can
 *  reference it in create_file/rename_file/move_file/delete_file calls), quantity, and any
 *  selected rollup value. Tries the full tree first; only truncates (greedy, in tree order, with
 *  a note) when it's actually over budget — no stripping ladder, unlike documents, since there's
 *  no "less important item type" distinction in a part tree the way there is for block types. */
export function buildPartTreePageContext(
  root: Item,
  childrenMap: Map<string, Item[]>,
  displayValues: Map<string, EqValue>,
  cadDisplayValues: Map<string, EqValue>,
  valueToSumLabel: string,
  cadValueLabel: string,
  importsByItemId: Map<string, ImportEdge[]>,
  charBudget = PAGE_CONTEXT_CHAR_BUDGET,
): PageContextResult {
  const rootLine = `Part Tree: ${root.name} (id ${root.id})${(childrenMap.get(root.id) ?? []).length === 0 ? " (empty — no subsystems or parts yet)" : ""}`;
  const lines: string[] = [rootLine];
  for (const child of childrenMap.get(root.id) ?? []) {
    walk(child, childrenMap, 1, displayValues, cadDisplayValues, valueToSumLabel, cadValueLabel, importsByItemId, lines);
  }
  const fullText = lines.join("\n");
  if (fullText.length <= charBudget) return { text: fullText, reduced: false };

  const { text: truncated, keptCount } = truncateLinesToBudget(lines, charBudget);
  const note =
    `[Note: this part tree is very large — showing only the first ${keptCount} of ${lines.length} ` +
    `items, truncated to fit. If asked to summarize or review the whole tree, say so rather than ` +
    `assuming this is everything.]`;
  return { text: `${note}\n${truncated}`, reduced: true };
}

/** The containing subsystem's name for a selected item's chip — the part-tree equivalent of
 *  a document's "nearest preceding header." Walks the parentId chain to the nearest
 *  WORKSPACE-typed ancestor, or falls back to the part tree's own name if there isn't one
 *  (the item is top-level). */
export function buildSelectedItemLocation(itemId: string, items: Item[], root: Item): string {
  const byId = new Map(items.map((i) => [i.id, i]));
  let current = byId.get(itemId);
  while (current) {
    const parentId = current.parentId;
    if (!parentId || parentId === root.id) return root.name;
    const parent = byId.get(parentId);
    if (!parent) return root.name;
    if (parent.type === "WORKSPACE") return parent.name;
    current = parent;
  }
  return root.name;
}
