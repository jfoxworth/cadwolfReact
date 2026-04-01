import type { BuiltinFn, Matrix } from "../../types";

// logspace(start, stop, n) — n logarithmically spaced points from 10^start to 10^stop (inclusive)
// Default n = 50. Mirrors numpy.logspace / MATLAB logspace.
export const logspace: BuiltinFn = async (args, _ctx) => {
  const start = args[0]?.["0-0"] ?? 0;
  const stop  = args[1]?.["0-0"] ?? 1;
  const n     = Math.max(2, Math.round(args[2]?.["0-0"] ?? 50));

  const result: Matrix = {};
  for (let i = 0; i < n; i++) {
    const exp = start + (i / (n - 1)) * (stop - start);
    result[`0-${i}`] = Math.pow(10, exp);
  }
  return result;
};
