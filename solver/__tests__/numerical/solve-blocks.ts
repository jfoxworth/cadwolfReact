import { solveDocument } from "../../worker/document-solver";
import type { OrderedBlock, ResolvedEquation } from "../../types";

/** One equation block. `unit` is the unit the block's value is declared in (like the unit box in a document). */
export const eq = (raw: string, unit = ""): { raw: string; unit: string } => ({ raw, unit });

/** Solves equation blocks top to bottom, as a document does, and returns the last block's result. */
export async function solveBlocks(defs: { raw: string; unit: string }[]) {
  const blocks: OrderedBlock[] = defs.map((d, i) => ({
    id: `b${i + 1}`,
    order: i + 1,
    type: "EQUATION",
    definition: { raw: d.raw, variableName: d.raw.split("=")[0].trim(), unit: d.unit },
  }) as OrderedBlock);
  let resolved: ResolvedEquation[] = [];
  let last;
  for (const b of blocks) {
    const r = await solveDocument(blocks, b.id, resolved);
    resolved = r.resolvedMap;
    last = r.results.find((x) => x.blockId === b.id);
  }
  return last!;
}
