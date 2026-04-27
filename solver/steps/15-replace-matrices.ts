import type { SolveContext, StepFn } from "../types";
import { encodeMatrix, decodeMatrix } from "./matrix-utils";

const emptyBase: [number, number, number, number, number, number, number, number] =
  [0, 0, 0, 0, 0, 0, 0, 0];

// Step 15: Replace_Matrices
// Finds matrix/vector literals written as "[a,b;c,d]" (commas = columns,
// semicolons = rows), evaluates each cell via a sub-pipeline, and replaces
// the entire bracket expression with an encoded MATRIX:: token that survives
// the rest of the string-based pipeline.
//
// "[" preceded by an alphabetic token is matrix-indexing (step 13) — skipped.
export const replaceMatrices: StepFn = async (ctx: SolveContext): Promise<SolveContext> => {
  if (ctx.errors.length > 0) return ctx;

  const tokens = [...ctx.tokens];
  const keyArray = [...ctx.keyArray];

  let i = 0;
  while (i < tokens.length) {
    if (tokens[i] !== "[") { i++; continue; }

    // If preceded by a letter/underscore it's matrix indexing (step 13) — skip
    if (i > 0 && /^[A-Za-z_]/.test(tokens[i - 1])) { i++; continue; }

    // Find the matching "]"
    let depth = 1;
    let j = i + 1;
    while (j < tokens.length && depth > 0) {
      if (tokens[j] === "[") depth++;
      else if (tokens[j] === "]") depth--;
      j++;
    }
    if (depth !== 0) { i++; continue; } // unmatched bracket — skip

    // tokens[i] = "[", tokens[j-1] = "]"
    // inner tokens are tokens[i+1 .. j-2]
    const innerTokens = tokens.slice(i + 1, j - 1).filter((t) => t !== "");

    // Split by ";" into row groups
    const rowGroups: string[][] = [];
    let cur: string[] = [];
    for (const tok of innerTokens) {
      if (tok === ";") { rowGroups.push(cur); cur = []; }
      else cur.push(tok);
    }
    rowGroups.push(cur);

    // Split each row by "," into cell expressions
    const cellGroups: string[][][] = rowGroups.map((row) => {
      const cells: string[][] = [];
      let cell: string[] = [];
      for (const tok of row) {
        if (tok === ",") { cells.push(cell); cell = []; }
        else cell.push(tok);
      }
      cells.push(cell);
      return cells;
    });

    // Dynamic import avoids circular dependency with pipeline.ts
    const { runPipeline } = await import("../pipeline");

    const real: Record<string, number> = {};
    const numRows = cellGroups.length;
    let numCols = 0;
    let cellBaseUnits: number[] | undefined;

    for (let r = 0; r < cellGroups.length; r++) {
      if (cellGroups[r].length > numCols) numCols = cellGroups[r].length;
      for (let c = 0; c < cellGroups[r].length; c++) {
        const rawCellTokens = cellGroups[r][c];

        // Replace any MATRIX tokens in the cell with their numeric SI values.
        // MATRIX tokens are produced by step 10 (variable substitution) and
        // step 12 (constants). splitText in the sub-pipeline would mangle their
        // encoded format (the JSON contains characters splitText splits on),
        // so we decode them here and substitute plain numbers.
        // Units are propagated through * and / operators across all MATRIX tokens.
        let inferredUnits: number[] | undefined;
        let pendingOp = "*"; // treat first token as implicitly multiplied
        const resolvedTokens = rawCellTokens.map((tok) => {
          if (tok.startsWith("MATRIX::")) {
            const mat = decodeMatrix(tok);
            const ba = mat?.baseArray?.some(v => v !== 0) ? mat.baseArray : null;
            if (ba) {
              if (!inferredUnits) {
                inferredUnits = [...ba];
              } else if (pendingOp === "*") {
                inferredUnits = inferredUnits.map((v, idx) => v + (ba[idx] ?? 0));
              } else if (pendingOp === "/") {
                inferredUnits = inferredUnits.map((v, idx) => v - (ba[idx] ?? 0));
              }
              // for + and -, units stay the same (operands must be compatible)
            }
            pendingOp = "*";
            return String(mat?.real["0-0"] ?? 0);
          }
          if (tok === "*" || tok === "/" || tok === "+" || tok === "-") pendingOp = tok;
          return tok;
        });
        if (!cellBaseUnits && inferredUnits?.some(v => v !== 0)) {
          cellBaseUnits = inferredUnits;
        }

        const cellExpr = resolvedTokens.join(" ").trim();
        if (!cellExpr) { real[`${r}-${c}`] = 0; continue; }

        // Fast path: plain numeric literal — avoids a full sub-pipeline run
        const fastN = parseFloat(cellExpr);
        if (!isNaN(fastN) && /^-?[\d.]+([eE][+\-]?\d+)?$/.test(cellExpr.replace(/\s/g, ""))) {
          real[`${r}-${c}`] = fastN;
          continue;
        }

        const subCtx: SolveContext = {
          ...ctx,
          eqId: `${ctx.eqId}_m${r}c${c}`,
          rawEquation: `_cell_=${cellExpr}`,
          workingString: `_cell_=${cellExpr}`,
          variableName: "",
          rhsString: "",
          tokens: [],
          keyArray: [],
          variableArray: [],
          postfixArray: [],
          solution: {
            real: { "0-0": 0 }, imag: { "0-0": 0 },
            size: "1x1", units: "", baseUnits: emptyBase, multiplier: 1, quantity: "",
          },
          display: { equation: "", solution: "", numericalModel: "", unitsModel: "", dimensionsModel: "", quantitiesModel: "" },
          errors: [],
        };

        const result = await runPipeline(subCtx);
        if (result.errors.length === 0) {
          real[`${r}-${c}`] = (result.solution.real["0-0"] ?? 0) * result.solution.multiplier;
          if (!cellBaseUnits && result.solution.baseUnits?.some(v => v !== 0)) {
            cellBaseUnits = [...result.solution.baseUnits];
          }
        } else {
          const fallback = parseFloat(cellExpr);
          real[`${r}-${c}`] = isNaN(fallback) ? 0 : fallback;
        }
      }
    }

    const size = `${numRows}x${numCols}`;
    tokens.splice(i, j - i, encodeMatrix(real, size, undefined, cellBaseUnits));
    keyArray.splice(i, j - i, 0);
    // Re-check same position (handles adjacent matrices)
  }

  return { ...ctx, tokens, keyArray };
};
