import type { BuiltinFn, Matrix } from "../../types";

// floor(expr)         — plain floor of every element
// floor(expr, unit)   — round down to the nearest whole unit
//   step 07 resolves the unit name to its conv_factor and passes it as args[1]["0-0"].
//   Algorithm: mult * Math.floor(val_in_SI / mult)
//   This matches the legacy eqSolverOld.js floor() behaviour.
export const floor: BuiltinFn = async (args, _ctx) => {
  if (args.length > 2) throw new Error(`floor() takes 1 or 2 arguments, got ${args.length}`);
  const mat  = args[0] ?? {};
  const mult = args[1]?.["0-0"] ?? 0;

  const result: Matrix = {};
  for (const [key, val] of Object.entries(mat)) {
    result[key] = mult > 0
      ? mult * Math.floor(val / mult)
      : Math.floor(val);
  }
  return result;
};
