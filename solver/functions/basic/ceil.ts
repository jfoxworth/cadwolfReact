import type { BuiltinFn, Matrix } from "../../types";

// ceil(expr)         — plain ceil of every element
// ceil(expr, unit)   — round up to the nearest whole unit
//   step 07 resolves the unit name to its conv_factor and passes it as args[1]["0-0"].
//   Algorithm: mult * Math.ceil(val_in_SI / mult)
//   This matches the legacy eqSolverOld.js ceil() behaviour.
export const ceil: BuiltinFn = async (args, _ctx) => {
  if (args.length > 2) throw new Error(`ceil() takes 1 or 2 arguments, got ${args.length}`);
  const mat  = args[0] ?? {};
  const mult = args[1]?.["0-0"] ?? 0;

  const result: Matrix = {};
  for (const [key, val] of Object.entries(mat)) {
    result[key] = mult > 0
      ? mult * Math.ceil(val / mult)
      : Math.ceil(val);
  }
  return result;
};
