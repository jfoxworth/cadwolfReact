import type { SolveContext, StepFn, UnitBaseArray } from "../types";
import { PARSE_UNIT_MAP } from "../units/parse-unit-data";
import { parseCompound } from "../units/parse-compound";

// Step 23: Decompose_Units
// After step 22 has scaled units to canonical SI form, look up each canonical
// unit symbol in parseUnits.json to get its base dimension exponents.
// Accumulate: base[i] += entry.baseArray[i] * power
export const decomposeUnits: StepFn = async (ctx: SolveContext): Promise<SolveContext> => {
  if (ctx.errors.length > 0 || !ctx.solution.units) return ctx;

  // Step 16 already computed the correct combined baseUnits for multi-operand
  // expressions (e.g. grav * density * volume → N). Don't overwrite it here
  // with a decomposition of only the first unit string.
  if (ctx.solution.baseUnits?.some((v) => v !== 0)) return ctx;

  const base: UnitBaseArray = [0, 0, 0, 0, 0, 0, 0, 0];
  const terms = parseCompound(ctx.solution.units);

  for (const { symbol, power } of terms) {
    const entry = PARSE_UNIT_MAP.get(symbol);
    if (!entry) continue;
    for (let i = 0; i < 8; i++) base[i] += entry.baseArray[i] * power;
  }

  return {
    ...ctx,
    solution: { ...ctx.solution, baseUnits: base },
  };
};
