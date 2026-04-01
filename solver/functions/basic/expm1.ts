import type { BuiltinFn, Matrix } from "../../types";

// expm1(x) — exp(x) - 1, numerically accurate for small x
export const expm1: BuiltinFn = async (args, _ctx) => {
  const A = args[0] ?? {};
  const result: Matrix = {};
  for (const [k, v] of Object.entries(A)) result[k] = Math.expm1(v ?? 0);
  return result;
};
