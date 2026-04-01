import type { BuiltinFn, Matrix } from "../../types";
import { matSize, toArray2d } from "./mat-utils";

// Modified Gram-Schmidt QR decomposition (reused from qr.ts)
function gramSchmidtQ(arr: number[][], m: number, n: number): { Q: number[][], diagR: number[] } {
  const Q: number[][] = Array.from({ length: m }, (_, i) =>
    Array.from({ length: n }, (_, j) => arr[i]?.[j] ?? 0)
  );
  const diagR: number[] = [];

  for (let j = 0; j < n; j++) {
    for (let i = 0; i < j; i++) {
      let dot = 0;
      for (let k = 0; k < m; k++) dot += (Q[k]?.[i] ?? 0) * (Q[k]?.[j] ?? 0);
      for (let k = 0; k < m; k++) (Q[k] as number[])[j] -= dot * (Q[k]?.[i] ?? 0);
    }
    let norm = 0;
    for (let k = 0; k < m; k++) norm += (Q[k]?.[j] ?? 0) ** 2;
    norm = Math.sqrt(norm);
    diagR.push(norm);
    if (norm > 1e-14) {
      for (let k = 0; k < m; k++) (Q[k] as number[])[j] /= norm;
    }
  }
  return { Q, diagR };
}

// orth(A) — orthonormal basis for the column space of A.
// Returns the columns of Q (from economy QR) corresponding to non-negligible R diagonal entries.
export const orth: BuiltinFn = async (args, _ctx) => {
  const A = args[0] ?? {};
  const [m, n] = matSize(A);
  if (m === 0 || n === 0) return { "0-0": 0 };

  const arr = toArray2d(A, m, n);
  const { Q, diagR } = gramSchmidtQ(arr, m, n);

  // Determine effective rank threshold
  const maxR = Math.max(...diagR, 0);
  const tol = Math.max(m, n) * maxR * 2.2e-16;

  // Collect columns where |R[j,j]| > tol
  const keepCols = diagR.map((v, j) => ({ v, j })).filter(({ v }) => v > tol);

  const result: Matrix = {};
  if (keepCols.length === 0) {
    for (let i = 0; i < m; i++) result[`${i}-0`] = 0;
    return result;
  }

  for (let fc = 0; fc < keepCols.length; fc++) {
    const j = keepCols[fc]!.j;
    for (let i = 0; i < m; i++) result[`${i}-${fc}`] = Q[i]?.[j] ?? 0;
  }
  return result;
};
