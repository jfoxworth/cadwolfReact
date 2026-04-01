import type { BuiltinFn, Matrix } from "../../types";

// clip(x, lo, hi) — clamp every element of x to [lo, hi]
// lo defaults to -Infinity, hi defaults to +Infinity
export const clip: BuiltinFn = async (args, _ctx) => {
  const A = args[0] ?? {};
  const lo = args[1]?.["0-0"] ?? -Infinity;
  const hi = args[2]?.["0-0"] ?? Infinity;
  const result: Matrix = {};
  for (const [k, v] of Object.entries(A)) {
    result[k] = Math.min(hi, Math.max(lo, v ?? 0));
  }
  return result;
};
