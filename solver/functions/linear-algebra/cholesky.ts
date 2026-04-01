import type { BuiltinFn, Matrix } from "../../types";

// cholesky(A)  →  lower-triangular Cholesky factor L  such that A = L * L^T
// A must be square and symmetric positive-definite.
// Returns L (lower-triangular), same size as A.
export const cholesky: BuiltinFn = async (args, _ctx) => {
  const A = args[0] ?? {};
  const keys = Object.keys(A);
  if (keys.length === 0) return { "0-0": 0 };

  let n = 0;
  for (const k of keys) {
    const r = parseInt(k.split("-")[0], 10);
    if (r >= n) n = r + 1;
  }

  const a = (r: number, c: number) => A[`${r}-${c}`] ?? 0;

  // Build upper-triangular U such that A = U^T * U  (matching old code algorithm)
  const U: Matrix = {};
  for (let i = 0; i < n; i++) {
    let sum1 = a(i, i);
    for (let b = 0; b < i; b++) sum1 -= (U[`${b}-${i}`] ?? 0) ** 2;
    U[`${i}-${i}`] = Math.sqrt(Math.max(sum1, 0));

    for (let j = i + 1; j < n; j++) {
      let sum2 = a(i, j);
      for (let c = 0; c < i; c++) sum2 -= (U[`${c}-${i}`] ?? 0) * (U[`${c}-${j}`] ?? 0);
      U[`${i}-${j}`] = U[`${i}-${i}`] !== 0 ? sum2 / U[`${i}-${i}`] : 0;
    }

    for (let b = 0; b < i; b++) U[`${i}-${b}`] = 0;
  }

  // Return L = U^T (lower-triangular)
  const L: Matrix = {};
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      L[`${r}-${c}`] = U[`${c}-${r}`] ?? 0;

  return L;
};
