import type { BuiltinFn, Matrix } from "../../types";

// tril(A, k?) — lower triangular part of A at diagonal offset k (default 0)
export const tril: BuiltinFn = async (args, _ctx) => {
  const A = args[0] ?? {};
  const k = Math.round(args[1]?.["0-0"] ?? 0);
  const result: Matrix = {};
  for (const key of Object.keys(A)) {
    const [r, c] = key.split("-").map(Number);
    if (c - r <= k) result[key] = A[key] ?? 0;
    else result[key] = 0;
  }
  return result;
};
