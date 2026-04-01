import type { BuiltinFn, Matrix } from "../../types";

// full(m, n, val) — m×n matrix filled with val
// full(m, val)    — m×m matrix filled with val
// Mirrors numpy.full / MATLAB ones(m,n)*val.
export const full: BuiltinFn = async (args, _ctx) => {
  let m: number, n: number, val: number;

  if (args.length === 2) {
    m   = Math.max(1, Math.round(args[0]?.["0-0"] ?? 1));
    n   = m;
    val = args[1]?.["0-0"] ?? 0;
  } else {
    m   = Math.max(1, Math.round(args[0]?.["0-0"] ?? 1));
    n   = Math.max(1, Math.round(args[1]?.["0-0"] ?? 1));
    val = args[2]?.["0-0"] ?? 0;
  }

  const result: Matrix = {};
  for (let r = 0; r < m; r++) {
    for (let c = 0; c < n; c++) result[`${r}-${c}`] = val;
  }
  return result;
};
