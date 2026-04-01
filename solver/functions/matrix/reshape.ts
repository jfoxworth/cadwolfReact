import type { BuiltinFn, Matrix } from "../../types";

// reshape(A, m, n) — reshape matrix A into m×n, reading/writing in column-major order
export const reshape: BuiltinFn = async (args, _ctx) => {
  const A = args[0] ?? {};
  const m = Math.max(1, Math.round(args[1]?.["0-0"] ?? 1));
  const n = Math.max(1, Math.round(args[2]?.["0-0"] ?? 1));

  const sorted = Object.keys(A).sort((a, b) => {
    const [ar, ac] = a.split("-").map(Number);
    const [br, bc] = b.split("-").map(Number);
    return ac !== bc ? ac - bc : ar - br; // column-major
  });

  const result: Matrix = {};
  sorted.forEach((k, idx) => {
    const col = Math.floor(idx / m);
    const row = idx % m;
    if (row < m && col < n) result[`${row}-${col}`] = A[k] ?? 0;
  });
  return result;
};
