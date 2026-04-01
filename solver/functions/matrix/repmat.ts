import type { BuiltinFn, Matrix } from "../../types";

// repmat(A, m, n) — tile matrix A m times vertically and n times horizontally
export const repmat: BuiltinFn = async (args, _ctx) => {
  const A = args[0] ?? {};
  const m = Math.max(1, Math.round(args[1]?.["0-0"] ?? 1));
  const n = args[2] !== undefined ? Math.max(1, Math.round(args[2]["0-0"] ?? 1)) : m;

  let rows = 0, cols = 0;
  for (const k of Object.keys(A)) {
    const [r, c] = k.split("-").map(Number);
    if (r >= rows) rows = r + 1;
    if (c >= cols) cols = c + 1;
  }
  if (rows === 0 || cols === 0) return {};

  const result: Matrix = {};
  for (let tr = 0; tr < m; tr++) {
    for (let tc = 0; tc < n; tc++) {
      for (const k of Object.keys(A)) {
        const [r, c] = k.split("-").map(Number);
        result[`${tr * rows + r}-${tc * cols + c}`] = A[k] ?? 0;
      }
    }
  }
  return result;
};
