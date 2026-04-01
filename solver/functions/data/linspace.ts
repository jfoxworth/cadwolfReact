import type { BuiltinFn, Matrix } from "../../types";

// linspace(start, stop, n) — n evenly spaced points from start to stop (inclusive)
export const linspace: BuiltinFn = async (args, _ctx) => {
  const start = args[0]?.["0-0"] ?? 0;
  const stop  = args[1]?.["0-0"] ?? 1;
  const n     = Math.max(2, Math.round(args[2]?.["0-0"] ?? 100));

  const result: Matrix = {};
  for (let i = 0; i < n; i++) {
    result[`0-${i}`] = start + (i / (n - 1)) * (stop - start);
  }
  return result;
};
