import type { SolveContext, StepFn } from "../types";
import { SCALE_UNIT_MAP } from "../units/scale-unit-data";
import { resolveBaseArray } from "../units/resolve-base-array";
import { encodeMatrix, isMatrixToken, decodeMatrix } from "./matrix-utils";

// Step 16: Replace_Numbers
// For each inline "number unit" pair (e.g. "3 m/s"):
//   1. Scale the number to SI using SCALE_UNIT_MAP
//   2. Resolve the unit's base-dimension exponent array
//   3. Encode the pair as a single MATRIX token with the baseArray embedded
//   4. Remove the unit token
//
// Unit algebra is then handled by step 26 which propagates baseArrays through
// each postfix operation. This correctly handles nested expressions like
// (m_A*v_A + m_B*v_B)/(m_A+m_B) → m/s.

function getPrecedingOp(tokens: string[], i: number): string | null {
  let j = i;
  while (j >= 0) {
    const tok = tokens[j];
    if (tok === "(" || tok === ")") { j--; continue; }
    if (tok === "*" || tok === "/" || tok === "+" || tok === "-") return tok;
    return null;
  }
  return null;
}

// Validates that top-level addition/subtraction of inline literal units is compatible.
function checkAddCompat(tokens: string[], keyArray: (number | string)[]): string | null {
  const addOpIdxs: number[] = [];
  let depth = 0;
  const UNARY_PREV = new Set(["+", "-", "*", "/", "^", "(", "["]);
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === "(" || t === "[") depth++;
    else if (t === ")" || t === "]") depth--;
    else if (depth === 0 && (t === "+" || t === "-")) {
      const prev = i > 0 ? tokens[i - 1] : null;
      if (prev === null || UNARY_PREV.has(prev)) continue;
      addOpIdxs.push(i);
    }
  }
  if (addOpIdxs.length === 0) return null;

  const segs: Array<[number, number]> = [];
  let start = 0;
  for (const opIdx of addOpIdxs) { segs.push([start, opIdx]); start = opIdx + 1; }
  segs.push([start, tokens.length]);

  type SegBase = number[] | "dimensionless";
  const segBases: SegBase[] = segs.map(([s, e]) => {
    const segBase = [0, 0, 0, 0, 0, 0, 0, 0];
    let hasUnit = false;
    for (let i = s; i < e; i++) {
      let base: number[] | null = null;
      if (keyArray[i] === 1 || (keyArray[i] as unknown as string) === "1") {
        // Raw unit symbol
        base = resolveBaseArray(tokens[i]);
      } else if (isMatrixToken(tokens[i])) {
        // Already-encoded MATRIX token (e.g. variable substituted by step 10)
        const mat = decodeMatrix(tokens[i]);
        if (mat?.baseArray?.some((v) => v !== 0)) base = mat.baseArray!;
      }
      if (base) {
        const op = i > 0 ? getPrecedingOp(tokens, i - 1) : null;
        if (op === "+" || op === "-") {
          if (!hasUnit) { for (let j = 0; j < 8; j++) segBase[j] += base[j]; hasUnit = true; }
        } else {
          const divide = op === "/";
          for (let j = 0; j < 8; j++) segBase[j] += divide ? -base[j] : base[j];
          hasUnit = true;
        }
      }
    }
    return hasUnit ? segBase : "dimensionless";
  });

  const dimSegs = segBases.filter((b): b is number[] => b !== "dimensionless");
  const dimlessCount = segBases.filter((b) => b === "dimensionless").length;
  if (dimSegs.length > 0 && dimlessCount > 0) {
    return "Cannot add/subtract values with different units (mix of dimensioned and dimensionless)";
  }
  if (dimSegs.length > 1) {
    const ref = dimSegs[0];
    for (let k = 1; k < dimSegs.length; k++) {
      if (!ref.every((v, idx) => v === dimSegs[k][idx])) {
        return "Cannot add/subtract values with incompatible units";
      }
    }
  }
  return null;
}

function hasUnresolvedVariables(tokens: string[], keyArray: (number | string)[]): boolean {
  return tokens.some((tok, i) => {
    if (keyArray[i] === 1 || (keyArray[i] as unknown as string) === "1") return false; // unit token
    if (isMatrixToken(tok)) return false;
    if (["+", "-", "*", "/", "^", "(", ")", "[", "]", ","].includes(tok)) return false;
    if (tok.length > 0 && !isNaN(Number(tok))) return false;
    return true; // bare variable name — unresolved
  });
}

export const replaceNumbers: StepFn = async (ctx: SolveContext): Promise<SolveContext> => {
  const errors   = [...ctx.errors];
  const tokens   = [...ctx.tokens];
  const keyArray = [...ctx.keyArray];

  // Only run the static unit-compatibility pre-check when all variables have
  // been resolved (MATRIX tokens). If any bare variable token remains, skip
  // the check — step 26 will catch real mismatches at runtime with full info.
  if (!hasUnresolvedVariables(tokens, keyArray)) {
    const addError = checkAddCompat(tokens, keyArray);
    if (addError) {
      errors.push(addError);
      return { ...ctx, errors };
    }
  }

  function isNum(s: string): boolean {
    return s.length > 0 && !isNaN(Number(s));
  }

  for (let i = 0; i < tokens.length; i++) {
    if (!isNum(tokens[i])) continue; // skips MATRIX tokens, operators, parens

    const nextIsUnit =
      i + 1 < tokens.length &&
      (keyArray[i + 1] === 1 || keyArray[i + 1] === ("1" as unknown as number));
    if (!nextIsUnit) continue;

    const unitSym   = tokens[i + 1];
    const entry     = SCALE_UNIT_MAP.get(unitSym);
    const scaled    = entry ? Number(tokens[i]) * entry.conv_factor : Number(tokens[i]);
    const canonical = entry ? entry.conv_unit : unitSym;
    const unitBase  = resolveBaseArray(canonical) ?? undefined;

    // Encode as MATRIX token with embedded baseArray; step 26 propagates units.
    tokens[i]   = encodeMatrix({ "0-0": scaled }, "1x1", {}, unitBase);
    keyArray[i] = 0;

    // Remove the unit token (now embedded in the MATRIX token)
    tokens.splice(i + 1, 1);
    keyArray.splice(i + 1, 1);
  }

  return { ...ctx, tokens, keyArray, errors };
};
