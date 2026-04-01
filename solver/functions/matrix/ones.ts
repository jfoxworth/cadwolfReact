import type { BuiltinFn, Matrix } from "../../types";

// ones(m, n) — m×n matrix of ones. If only one arg, returns m×m.
export const ones: BuiltinFn = async (args, _ctx) => {
  const m = Math.max(1, Math.round(args[0]?.["0-0"] ?? 1));
  const n = args[1] !== undefined ? Math.max(1, Math.round(args[1]["0-0"] ?? 1)) : m;
  const result: Matrix = {};
  for (let r = 0; r < m; r++) {
    for (let c = 0; c < n; c++) result[`${r}-${c}`] = 1;
  }
  return result;
};
