import type { SolveContext, StepFn } from "../types";
import { PARSE_UNIT_MAP } from "../units/parse-unit-data";

// Named SI derived units that step 27 is allowed to recognise.
// All other units (area, volume, imperial, etc.) are intentionally excluded —
// results outside this set are expressed in base SI units instead.
const SI_DERIVED_WHITELIST = new Set([
  "Hz", "N", "Pa", "J", "W", "C", "V", "F", "Ω", "S", "Wb", "T", "H", "lm", "lx", "Bq", "Gy", "Sv", "kat",
]);

// Dimension order: [A, K, s, m, kg, cd, mol, rad]
const BASE_SYMBOLS = ["A", "K", "s", "m", "kg", "cd", "mol", "rad"] as const;

/**
 * Build a human-readable base-unit string from an 8-element exponent array.
 * e.g. [0,0,0,2,0,0,0,0] → "m^2", [0,0,-2,1,1,0,0,0] → "kg*m/s^2"
 */
function baseArrayToString(arr: readonly number[]): string {
  const pos: string[] = [];
  const neg: string[] = [];
  for (let i = 0; i < 8; i++) {
    const exp = arr[i];
    if (exp === 0) continue;
    const sym = BASE_SYMBOLS[i];
    const term = Math.abs(exp) === 1 ? sym : `${sym}^${Math.abs(exp)}`;
    if (exp > 0) pos.push(term);
    else neg.push(term);
  }
  if (pos.length === 0 && neg.length === 0) return "";
  const numerator = pos.join("*") || "1";
  if (neg.length === 0) return numerator;
  const denominator = neg.length === 1 ? neg[0] : `(${neg.join("*")})`;
  return `${numerator}/${denominator}`;
}

// Step 27: Recompose_Units (eqSolverOld.js lines 2739-2853)
// After solving, builds the canonical output unit string from the
// computed base-unit exponent array.
// Only recognises units from SI_DERIVED_WHITELIST (N, Pa, J, W, …).
// Everything else is expressed as a base-unit string (m^2, kg/s^2, …).
export const recomposeUnits: StepFn = async (ctx: SolveContext): Promise<SolveContext> => {
  if (ctx.errors.length > 0) return ctx;
  const { solution, unitList } = ctx;
  // Run when there is a known unit string OR when baseUnits was set by postfix unit propagation
  const hasBaseUnits = solution.baseUnits?.some((v) => v !== 0);
  if (!solution.units && !hasBaseUnits) return ctx;

  // 1. Check the user-supplied unit list first
  const listMatch = unitList.find((u) =>
    u.base.every((v, i) => v === solution.baseUnits[i]),
  );
  if (listMatch && listMatch.unit !== solution.units) {
    return { ...ctx, solution: { ...solution, units: listMatch.unit } };
  }

  // 2. Check whitelisted SI derived units (N, Pa, J, W, …)
  for (const name of SI_DERIVED_WHITELIST) {
    const entry = PARSE_UNIT_MAP.get(name);
    if (!entry) continue;
    if (entry.baseArray.every((v, i) => v === solution.baseUnits[i])) {
      const newUnits = entry.base_unit;
      if (newUnits !== solution.units) {
        return {
          ...ctx,
          solution: { ...solution, units: newUnits, quantity: entry.quantity },
        };
      }
      if (!solution.quantity && entry.quantity) {
        return { ...ctx, solution: { ...solution, quantity: entry.quantity } };
      }
      return ctx;
    }
  }

  // 3. Fall back to base-unit expression (m^2, kg/s^2, etc.)
  const baseStr = baseArrayToString(solution.baseUnits);
  if (baseStr && baseStr !== solution.units) {
    return { ...ctx, solution: { ...solution, units: baseStr } };
  }

  return ctx;
};
