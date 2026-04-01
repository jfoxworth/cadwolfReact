import type { BuiltinFn, Matrix } from "../../types";

// zeros(m, n) — m×n matrix of zeros. If only one arg, returns m×m.
export const zeros: BuiltinFn = async (args, _ctx) => {
  const m = Math.max(1, Math.round(args[0]?.["0-0"] ?? 1));
  const n = args[1] !== undefined ? Math.max(1, Math.round(args[1]["0-0"] ?? 1)) : m;
  const result: Matrix = {};
  for (let r = 0; r < m; r++) {
    for (let c = 0; c < n; c++) result[`${r}-${c}`] = 0;
  }
  return result;
};
