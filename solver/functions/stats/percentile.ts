import type { BuiltinFn } from "../../types";

// percentile(v, p) — pth percentile of vector v, p in [0, 100]
// Uses linear interpolation between adjacent ranks.
export const percentile: BuiltinFn = async (args, _ctx) => {
  const vals = Object.values(args[0] ?? {}).sort((a, b) => a - b);
  if (vals.length === 0) return { "0-0": NaN };
  const p   = Math.max(0, Math.min(100, args[1]?.["0-0"] ?? 50));
  const idx = (p / 100) * (vals.length - 1);
  const lo  = Math.floor(idx);
  const hi  = Math.ceil(idx);
  return { "0-0": vals[lo] + (idx - lo) * (vals[hi] - vals[lo]) };
};
