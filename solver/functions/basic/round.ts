import type { BuiltinFn, Matrix } from "../../types";

// round(expr)       — round each element to nearest integer
// round(expr, n)    — round each element to n decimal places (n may be negative)
//   Formula: Math.round(val * 10^n) / 10^n
//   Applies to both real and imaginary parts (step 07 calls this function separately for each).
//
// From eqSolverOld.js lines 7196-7254:
//   multiplier (2nd arg) must be an integer; errors if non-integer.
export const round: BuiltinFn = async (args, _ctx) => {
  const mat = args[0] ?? {};
  const n   = Math.round(args[1]?.["0-0"] ?? 0); // decimal places, default 0
  const pow = Math.pow(10, n);

  const result: Matrix = {};
  for (const [key, val] of Object.entries(mat)) {
    result[key] = Math.round(val * pow) / pow;
  }
  return result;
};
