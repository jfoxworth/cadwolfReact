import type { BuiltinFn, Matrix } from "../../types";

// log1p(x) — natural log of (1 + x), numerically accurate for small x
export const log1p: BuiltinFn = async (args, _ctx) => {
  const A = args[0] ?? {};
  const result: Matrix = {};
  for (const [k, v] of Object.entries(A)) result[k] = Math.log1p(v ?? 0);
  return result;
};
