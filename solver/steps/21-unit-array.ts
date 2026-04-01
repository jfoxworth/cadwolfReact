import type { SolveContext, StepFn } from "../types";
import { SCALE_UNIT_MAP } from "../units/scale-unit-data";
import { PARSE_UNIT_MAP } from "../units/parse-unit-data";
import { parseCompound } from "../units/parse-compound";
import { resolveBaseArray } from "../units/resolve-base-array";

// Step 21: Unit_Array (eqSolverOld.js lines 2383-2406)
// Scans the token array for unit tokens (keyArray[i] === 1) and resolves
// the unit string into base-unit exponent array and multiplier.
// The unit string is stored in ctx.solution.units.
//
// Also checks unit compatibility: if the expression contains + or - and the
// unit tokens represent incompatible physical dimensions (e.g. length + mass),
// an error is added and the pipeline is aborted.
export const unitArray: StepFn = async (ctx: SolveContext): Promise<SolveContext> => {
  const { tokens, keyArray } = ctx;
  const solution = { ...ctx.solution };

  // ── Unit compatibility check for addition/subtraction ──────────────────────
  // Collect all unit tokens present in the RHS, along with whether + or -
  // appears among the non-unit tokens.
  const hasAddSub = tokens.some((t, i) => keyArray[i] !== 1 && (t === "+" || t === "-"));
  if (hasAddSub) {
    const unitTokens = tokens.filter((_, i) => keyArray[i] === 1);
    if (unitTokens.length > 1) {
      const baseArrays = unitTokens.map(resolveBaseArray).filter(Boolean) as number[][];
      if (baseArrays.length > 1) {
        const first = baseArrays[0];
        const allCompatible = baseArrays.every((u) => u.every((v, i) => v === first[i]));
        if (!allCompatible) {
          return {
            ...ctx,
            errors: [...ctx.errors, "Unit1: Cannot add or subtract quantities with incompatible units."],
          };
        }
      }
    }
  }

  // If step 16 already computed a combined baseUnits array (non-zero), trust it
  // and skip the single-unit lookup below — it would only see the first unit token.
  if (solution.baseUnits?.some((v) => v !== 0)) {
    return { ...ctx, solution };
  }

  // If ctx.solution.units is already populated (from block definition), use it
  // Otherwise, look for the first unit token in the token array
  if (!solution.units) {
    const unitIndex = keyArray.indexOf(1);
    if (unitIndex >= 0) {
      solution.units = tokens[unitIndex];
    }
  }

  // If we have a unit string, try to resolve it from SCALE_UNIT_MAP → PARSE_UNIT_MAP
  if (solution.units) {
    // Try direct lookup in PARSE_UNIT_MAP (already a base unit like "m", "N")
    const direct = PARSE_UNIT_MAP.get(solution.units);
    if (direct) {
      solution.baseUnits  = direct.baseArray;
      solution.multiplier = 1;
      solution.quantity   = direct.quantity;
      return { ...ctx, solution };
    }

    // Try SCALE_UNIT_MAP lookup (scaled unit like "km", "kN")
    const scaled = SCALE_UNIT_MAP.get(solution.units);
    if (scaled) {
      const base = PARSE_UNIT_MAP.get(scaled.conv_unit);
      if (base) {
        solution.baseUnits  = base.baseArray;
        solution.multiplier = scaled.conv_factor;
        solution.quantity   = base.quantity;
        return { ...ctx, solution };
      }
    }
  }

  // No units or unit not recognised — leave baseUnits as-is
  return { ...ctx, solution };
};
