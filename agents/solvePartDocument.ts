// Solves a part document's equations on the server, the way the browser does it one block at a
// time, so the part agent can see its own errors before anything is saved. Imported variables
// are fed in as virtual equations ahead of the document, exactly as documentWrapper.tsx does.
import { solveDocument } from "@/solver/worker/document-solver";
import type { OrderedBlock, ResolvedEquation } from "@/solver/types";

export interface PartImportValue {
  localAlias: string;
  value: number;
  units: string | null;
}

export interface SolvedEquation {
  /** Index of the block in the list passed in. */
  index: number;
  raw: string;
  /** Present when the equation solved: what the saved block shows. */
  solution?: { real: Record<string, number>; size: string; units: string; display: string; errors: string[] };
  /** First line for the model: the value, or the error. */
  summary: string;
  error?: string;
}

function formatScalar(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toPrecision(6)));
}

/** `equations` are the document's equation blocks in order, with their index in the document. */
export async function solvePartEquations(
  equations: { index: number; raw: string; displayEq?: string }[],
  imports: PartImportValue[],
): Promise<SolvedEquation[]> {
  const blocks: OrderedBlock[] = [
    ...imports.map((imp, i): OrderedBlock => ({
      id: `import-${i}`,
      order: -(imports.length - i),
      type: "EQUATION",
      definition: { raw: `${imp.localAlias} = ${imp.value}${imp.units ? " " + imp.units : ""}`, displayEq: "" },
    })),
    ...equations.map((e, i): OrderedBlock => ({
      id: `eq-${i}`,
      order: i + 1,
      type: "EQUATION",
      definition: { raw: e.raw, variableName: e.raw.split("=")[0]?.trim() ?? "", displayEq: e.displayEq ?? "" },
    })),
  ];

  let map: ResolvedEquation[] = [];
  // The imports first, so every equation can see them.
  for (let i = 0; i < imports.length; i++) {
    map = (await solveDocument(blocks, `import-${i}`, map)).resolvedMap;
  }

  const out: SolvedEquation[] = [];
  for (let i = 0; i < equations.length; i++) {
    const eq = equations[i];
    try {
      const r = await solveDocument(blocks, `eq-${i}`, map);
      map = r.resolvedMap;
      const res = r.results.find((x) => x.blockId === `eq-${i}`);
      if (!res) {
        out.push({ index: eq.index, raw: eq.raw, summary: "not solved", error: "The solver returned no result for this equation." });
      } else if (res.errors.length > 0 || !res.solution) {
        out.push({ index: eq.index, raw: eq.raw, summary: `ERROR: ${res.errors[0] ?? "no solution"}`, error: res.errors[0] ?? "no solution" });
      } else {
        const lhs = res.display.equation ?? eq.displayEq ?? "";
        const rhs = res.display.solution ?? "";
        const real = res.solution.real as Record<string, number>;
        const scalar = res.solution.size === "1x1" ? real["0-0"] : undefined;
        out.push({
          index: eq.index,
          raw: eq.raw,
          solution: {
            real,
            size: res.solution.size,
            units: res.solution.units,
            display: rhs ? `${lhs} = ${rhs}` : lhs,
            errors: [],
          },
          summary: scalar !== undefined
            ? `${formatScalar(scalar)}${res.solution.units ? " " + res.solution.units : ""}`
            : `matrix ${res.solution.size}${res.solution.units ? " " + res.solution.units : ""}`,
        });
      }
    } catch (err) {
      out.push({ index: eq.index, raw: eq.raw, summary: `ERROR: ${err instanceof Error ? err.message : String(err)}`, error: String(err) });
    }
  }
  return out;
}
