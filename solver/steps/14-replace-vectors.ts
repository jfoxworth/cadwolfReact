import type { SolveContext, StepFn } from "../types";
import { encodeMatrix } from "./matrix-utils";

const emptyBase: [number, number, number, number, number, number, number, number] =
  [0, 0, 0, 0, 0, 0, 0, 0];

// Step 14: Replace_Vectors
// Handles range-vector notation "[start:stop]" or "[start:step:stop]" inside
// square brackets. The colon-separated parts are evaluated as sub-expressions
// and the bracket expression is replaced with an encoded MATRIX:: row vector.
//
// "[0:5]"     → 1x6 row vector [0, 1, 2, 3, 4, 5]
// "[0:2:10]"  → 1x6 row vector [0, 2, 4, 6, 8, 10]
// "[1:0.5:3]" → 1x5 row vector [1, 1.5, 2, 2.5, 3]
//
// Brackets preceded by an alphabetic token are matrix-indexing (step 13) — skipped.
// Brackets without any ":" in their interior are matrix literals (step 15) — skipped.
export const replaceVectors: StepFn = async (ctx: SolveContext): Promise<SolveContext> => {
  if (ctx.errors.length > 0) return ctx;

  const tokens   = [...ctx.tokens];
  const keyArray = [...ctx.keyArray];

  let i = 0;
  while (i < tokens.length) {
    if (tokens[i] !== "[") { i++; continue; }

    // Skip matrix-indexing: "[" preceded by an identifier
    if (i > 0 && /^[A-Za-z_]/.test(tokens[i - 1])) { i++; continue; }

    // Find the matching "]", tracking nested depth
    let depth = 1;
    let j = i + 1;
    while (j < tokens.length && depth > 0) {
      if (tokens[j] === "[") depth++;
      else if (tokens[j] === "]") depth--;
      j++;
    }
    if (depth !== 0) { i++; continue; } // unmatched — skip

    // Inner tokens: tokens[i+1 .. j-2]
    const inner = tokens.slice(i + 1, j - 1).filter((t) => t !== "");

    // Only handle if there is a top-level ":" (depth 0 relative to this bracket)
    let hasColon = false;
    let innerDepth = 0;
    for (const tok of inner) {
      if (tok === "[") innerDepth++;
      else if (tok === "]") innerDepth--;
      else if (tok === ":" && innerDepth === 0) { hasColon = true; break; }
    }
    if (!hasColon) { i++; continue; } // matrix literal — leave for step 15

    // Split inner by top-level ":" to get [start, step?, stop] expression groups
    const parts: string[][] = [];
    let cur: string[] = [];
    innerDepth = 0;
    for (const tok of inner) {
      if (tok === "[") { innerDepth++; cur.push(tok); }
      else if (tok === "]") { innerDepth--; cur.push(tok); }
      else if (tok === ":" && innerDepth === 0) { parts.push(cur); cur = []; }
      else { cur.push(tok); }
    }
    parts.push(cur);

    if (parts.length < 2 || parts.length > 3) { i++; continue; } // unsupported form

    // Evaluate each part expression via a sub-pipeline
    const { runPipeline } = await import("../pipeline");

    async function evalPart(exprTokens: string[]): Promise<number | null> {
      const cellExpr = exprTokens.join(" ").trim();
      if (!cellExpr) return null;

      // Fast path: plain number
      const n = parseFloat(cellExpr);
      if (!isNaN(n) && String(n).length === cellExpr.replace(/\s/g, "").length) return n;

      const subCtx: SolveContext = {
        ...ctx,
        eqId: `${ctx.eqId}_v`,
        rawEquation: `_v_=${cellExpr}`,
        workingString: `_v_=${cellExpr}`,
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
      if (result.errors.length > 0) return null;
      return (result.solution.real["0-0"] ?? 0) * result.solution.multiplier;
    }

    let startVal: number | null;
    let stepVal:  number | null;
    let stopVal:  number | null;

    if (parts.length === 2) {
      startVal = await evalPart(parts[0]);
      stepVal  = 1;
      stopVal  = await evalPart(parts[1]);
    } else {
      startVal = await evalPart(parts[0]);
      stepVal  = await evalPart(parts[1]);
      stopVal  = await evalPart(parts[2]);
    }

    if (startVal === null || stepVal === null || stopVal === null || stepVal === 0) {
      i++; continue;
    }

    // Build the row vector
    const real: Record<string, number> = {};
    let col = 0;
    const MAX_ELEMENTS = 10_000;

    if (stepVal > 0) {
      for (let v = startVal; v <= stopVal + 1e-10 * Math.abs(stepVal) && col < MAX_ELEMENTS; v += stepVal) {
        real[`0-${col++}`] = v;
      }
    } else {
      for (let v = startVal; v >= stopVal - 1e-10 * Math.abs(stepVal) && col < MAX_ELEMENTS; v += stepVal) {
        real[`0-${col++}`] = v;
      }
    }

    if (col === 0) { i++; continue; }

    const size = `1x${col}`;
    tokens.splice(i, j - i, encodeMatrix(real, size));
    keyArray.splice(i, j - i, 0);
    // Don't increment i — re-check the same position
  }

  return { ...ctx, tokens, keyArray };
};
