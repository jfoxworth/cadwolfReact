import type { BuiltinFn, Matrix } from "../../types";

// cbrt(x) — cube root of every element (handles negative inputs)
export const cbrt: BuiltinFn = async (args, _ctx) => {
  const A = args[0] ?? {};
  const result: Matrix = {};
  for (const [k, v] of Object.entries(A)) result[k] = Math.cbrt(v ?? 0);
  return result;
};
