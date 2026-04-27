import type { SolveContext, StepFn } from "../types";
import { isMatrixToken, decodeMatrix, encodeMatrix } from "./matrix-utils";

const emptyBase: [number, number, number, number, number, number, number, number] =
  [0, 0, 0, 0, 0, 0, 0, 0];

// Step 13: Replace_Matrix_Pieces
// Handles element/slice access on previously-resolved matrices.
// By the time this step runs, step 10 has already replaced known matrix
// variable names with MATRIX:: encoded tokens.
//
// Supported forms (all indices are 0-based):
//   M[j]       — 2-D: column j as a column vector
//                row vector: element j  |  col vector: element j
//   M[i][j]    — row i then column j → scalar (chained bracket-per-dimension)
//   M[:][j]    — all rows, column j → column vector
//   M[i:k][j]  — rows i–k, column j → column vector
//   M[i:j]     — range on a 1-D vector
//   M[i,j]     — element at row i, column j → scalar (comma form, still supported)
//   M[i,j:k]   — column range within row i
//   M[i:j,k]   — row range within column k
//
// Indices are evaluated as sub-expressions via runPipeline so variables work.
export const replaceMatrixPieces: StepFn = async (ctx: SolveContext): Promise<SolveContext> => {
  if (ctx.errors.length > 0) return ctx;

  const tokens   = [...ctx.tokens];
  const keyArray = [...ctx.keyArray];
  const errors   = [...ctx.errors];

  // ── helpers ──────────────────────────────────────────────────────────────

  async function evalIndex(exprTokens: string[]): Promise<number | null> {
    const expr = exprTokens.join(" ").trim();
    if (!expr) return null;

    const n = parseFloat(expr);
    if (!isNaN(n)) return Math.round(n);

    const { runPipeline } = await import("../pipeline");
    const subCtx: SolveContext = {
      ...ctx,
      eqId: `${ctx.eqId}_idx`,
      rawEquation: `_i_=${expr}`,
      workingString: `_i_=${expr}`,
      variableName: "", rhsString: "",
      tokens: [], keyArray: [], variableArray: [], postfixArray: [],
      solution: { real: { "0-0": 0 }, imag: { "0-0": 0 }, size: "1x1", units: "", baseUnits: emptyBase, multiplier: 1, quantity: "" },
      display: { equation: "", solution: "", numericalModel: "", unitsModel: "", dimensionsModel: "", quantitiesModel: "" },
      errors: [],
    };
    const r = await runPipeline(subCtx);
    if (r.errors.length > 0) return null;
    return Math.round((r.solution.real["0-0"] ?? 0) * r.solution.multiplier);
  }

  // Split a flat token array by ":" at depth 0, returning the groups.
  function splitByColon(toks: string[]): string[][] {
    const parts: string[][] = [];
    let cur: string[] = [];
    let depth = 0;
    for (const t of toks) {
      if (t === "(" || t === "[") { depth++; cur.push(t); }
      else if (t === ")" || t === "]") { depth--; cur.push(t); }
      else if (t === ":" && depth === 0) { parts.push(cur); cur = []; }
      else { cur.push(t); }
    }
    parts.push(cur);
    return parts;
  }

  // Split a flat token array by "," at depth 0, returning the groups.
  function splitByComma(toks: string[]): string[][] {
    const parts: string[][] = [];
    let cur: string[] = [];
    let depth = 0;
    for (const t of toks) {
      if (t === "(" || t === "[") { depth++; cur.push(t); }
      else if (t === ")" || t === "]") { depth--; cur.push(t); }
      else if (t === "," && depth === 0) { parts.push(cur); cur = []; }
      else { cur.push(t); }
    }
    parts.push(cur);
    return parts;
  }

  // ── main scan ─────────────────────────────────────────────────────────────

  let i = 0;
  while (i < tokens.length) {
    // Look for a MATRIX:: token followed by "["
    if (!isMatrixToken(tokens[i]) || tokens[i + 1] !== "[") { i++; continue; }

    const mat = decodeMatrix(tokens[i]);
    if (!mat) { i++; continue; }

    const [rowsStr, colsStr] = mat.size.split("x");
    const numRows = parseInt(rowsStr, 10);
    const numCols = parseInt(colsStr, 10);

    // Find matching "]"
    let depth = 1;
    let j = i + 2;
    while (j < tokens.length && depth > 0) {
      if (tokens[j] === "[") depth++;
      else if (tokens[j] === "]") depth--;
      j++;
    }
    if (depth !== 0) { i++; continue; }

    // inner tokens: tokens[i+2 .. j-2]
    const inner = tokens.slice(i + 2, j - 1).filter((t) => t !== "");

    // Split by "," to get dimension specs (row spec, col spec)
    const dimParts = splitByComma(inner); // 1 or 2 entries

    let replacement: string;

    if (dimParts.length === 1) {
      // M[i] or M[i:j]  — single-dimension index
      const rowParts = splitByColon(dimParts[0]);

      if (rowParts.length === 1) {
        // M[i] — single element or column (0-based)
        const idx = await evalIndex(rowParts[0]);
        if (idx === null) { i++; continue; }
        const ri = idx; // 0-based directly

        if (numRows === 1) {
          // Row vector: return element at column ri
          const val = mat.real[`0-${ri}`] ?? 0;
          replacement = mat.baseArray
            ? encodeMatrix({ "0-0": val }, "1x1", undefined, mat.baseArray)
            : String(val);
        } else if (numCols === 1) {
          // Column vector: return element at row ri
          const val = mat.real[`${ri}-0`] ?? 0;
          replacement = mat.baseArray
            ? encodeMatrix({ "0-0": val }, "1x1", undefined, mat.baseArray)
            : String(val);
        } else {
          // 2-D matrix: bracket-per-dimension — M[j] selects column j
          const colReal: Record<string, number> = {};
          for (let r = 0; r < numRows; r++) colReal[`${r}-0`] = mat.real[`${r}-${ri}`] ?? 0;
          replacement = encodeMatrix(colReal, `${numRows}x1`, undefined, mat.baseArray);
        }

      } else if (rowParts.length === 2) {
        // M[i:j], M[:], M[i:], M[:j] — range or full-slice (empty part = full extent)
        // All indices are 0-based; default start = 0, default stop = last valid index.
        const startIdx = rowParts[0].length === 0 ? 0 : await evalIndex(rowParts[0]);
        const defaultStop = numRows === 1 ? numCols - 1 : numRows - 1;
        const stopIdx  = rowParts[1].length === 0 ? defaultStop : await evalIndex(rowParts[1]);
        if (startIdx === null || stopIdx === null) { i++; continue; }
        const startC = startIdx;
        const stopC  = stopIdx;

        if (numRows === 1) {
          // Row vector: slice columns
          const sliceReal: Record<string, number> = {};
          let col = 0;
          for (let c = startC; c <= stopC; c++) sliceReal[`0-${col++}`] = mat.real[`0-${c}`] ?? 0;
          replacement = col > 0 ? encodeMatrix(sliceReal, `1x${col}`, undefined, mat.baseArray) : "0";
        } else if (numCols === 1) {
          // Column vector: slice rows
          const sliceReal: Record<string, number> = {};
          let row = 0;
          for (let r = startC; r <= stopC; r++) sliceReal[`${row++}-0`] = mat.real[`${r}-0`] ?? 0;
          replacement = row > 0 ? encodeMatrix(sliceReal, `${row}x1`, undefined, mat.baseArray) : "0";
        } else {
          // 2-D matrix: slice rows, return sub-matrix with all columns
          const sliceReal: Record<string, number> = {};
          let row = 0;
          for (let r = startC; r <= stopC; r++) {
            for (let c = 0; c < numCols; c++) sliceReal[`${row}-${c}`] = mat.real[`${r}-${c}`] ?? 0;
            row++;
          }
          replacement = row > 0 ? encodeMatrix(sliceReal, `${row}x${numCols}`, undefined, mat.baseArray) : "0";
        }

      } else {
        i++; continue;
      }

    } else if (dimParts.length === 2) {
      // M[i, j]  or  M[i:j, k]  or  M[i, j:k]  — all indices 0-based
      const rowSpec = splitByColon(dimParts[0]);
      const colSpec = splitByColon(dimParts[1]);

      if (rowSpec.length === 1 && colSpec.length === 1) {
        // M[i, j] — scalar element (0-based)
        const ri = (await evalIndex(rowSpec[0]));
        const ci = (await evalIndex(colSpec[0]));
        if (ri === null || ci === null) { i++; continue; }
        const val = mat.real[`${ri}-${ci}`] ?? 0;
        replacement = mat.baseArray
          ? encodeMatrix({ "0-0": val }, "1x1", undefined, mat.baseArray)
          : String(val);

      } else if (rowSpec.length === 1 && colSpec.length === 2) {
        // M[i, j:k] — row slice within a single row (empty bound = full extent, 0-based)
        const ri     = await evalIndex(rowSpec[0]);
        const startC = colSpec[0].length === 0 ? 0           : await evalIndex(colSpec[0]);
        const stopC  = colSpec[1].length === 0 ? numCols - 1 : await evalIndex(colSpec[1]);
        if (ri === null || startC === null || stopC === null) { i++; continue; }
        const sliceReal: Record<string, number> = {};
        let col = 0;
        for (let c = startC; c <= stopC; c++) sliceReal[`0-${col++}`] = mat.real[`${ri}-${c}`] ?? 0;
        replacement = col > 0 ? encodeMatrix(sliceReal, `1x${col}`, undefined, mat.baseArray) : "0";

      } else if (rowSpec.length === 2 && colSpec.length === 1) {
        // M[i:j, k] or M[:, k] — column slice (empty row range = all rows, 0-based)
        const startR = rowSpec[0].length === 0 ? 0           : await evalIndex(rowSpec[0]);
        const stopR  = rowSpec[1].length === 0 ? numRows - 1 : await evalIndex(rowSpec[1]);
        const ci     = await evalIndex(colSpec[0]);
        if (startR === null || stopR === null || ci === null) { i++; continue; }
        const sliceReal: Record<string, number> = {};
        let row = 0;
        for (let r = startR; r <= stopR; r++) sliceReal[`${row++}-0`] = mat.real[`${r}-${ci}`] ?? 0;
        replacement = row > 0 ? encodeMatrix(sliceReal, `${row}x1`, undefined, mat.baseArray) : "0";

      } else if (rowSpec.length === 2 && colSpec.length === 2) {
        // M[i:j, k:l] — 2D submatrix slice
        const startR = rowSpec[0].length === 0 ? 0           : await evalIndex(rowSpec[0]);
        const stopR  = rowSpec[1].length === 0 ? numRows - 1 : await evalIndex(rowSpec[1]);
        const startC = colSpec[0].length === 0 ? 0           : await evalIndex(colSpec[0]);
        const stopC  = colSpec[1].length === 0 ? numCols - 1 : await evalIndex(colSpec[1]);
        if (startR === null || stopR === null || startC === null || stopC === null) { i++; continue; }
        const sliceReal: Record<string, number> = {};
        let row = 0;
        for (let r = startR; r <= stopR; r++) {
          let col = 0;
          for (let c = startC; c <= stopC; c++) sliceReal[`${row}-${col++}`] = mat.real[`${r}-${c}`] ?? 0;
          row++;
        }
        const sliceRows = row;
        const sliceCols = startC <= stopC ? stopC - startC + 1 : 0;
        replacement = sliceRows > 0 && sliceCols > 0 ? encodeMatrix(sliceReal, `${sliceRows}x${sliceCols}`, undefined, mat.baseArray) : "0";

      } else {
        i++; continue;
      }

    } else {
      i++; continue;
    }

    // Replace MATRIX::token + "[" + inner + "]" with the result
    tokens.splice(i, j - i, replacement);
    keyArray.splice(i, j - i, 0);
    // Don't increment — re-check same position
  }

  return { ...ctx, tokens, keyArray, errors };
};
