import type { BuiltinFn } from "../../types";
import { matSize, toArray2d, fromArray2d } from "./mat-utils";

// Modified Gram-Schmidt QR decomposition for m×n matrix A (m >= n).
// Returns Q (m×n orthonormal columns) when which=1 (default),
// or R (n×n upper triangular) when which=2.
function gramSchmidtQR(arr: number[][], m: number, n: number): { Q: number[][], R: number[][] } {
  // Deep-copy A as initial Q columns
  const Q: number[][] = Array.from({ length: m }, (_, i) =>
    Array.from({ length: n }, (_, j) => arr[i]?.[j] ?? 0)
  );
  const R: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let j = 0; j < n; j++) {
    // Orthogonalise column j against all previous columns (modified GS)
    for (let i = 0; i < j; i++) {
      let dot = 0;
      for (let k = 0; k < m; k++) dot += (Q[k]?.[i] ?? 0) * (Q[k]?.[j] ?? 0);
      R[i]![j] = dot;
      for (let k = 0; k < m; k++) (Q[k] as number[])[j] -= dot * (Q[k]?.[i] ?? 0);
    }
    // Normalise
    let norm = 0;
    for (let k = 0; k < m; k++) norm += (Q[k]?.[j] ?? 0) ** 2;
    norm = Math.sqrt(norm);
    R[j]![j] = norm;
    if (norm > 1e-14) {
      for (let k = 0; k < m; k++) (Q[k] as number[])[j] /= norm;
    }
  }
  return { Q, R };
}

// Convert column-based Q (Q[row][col]) to Matrix
function colsToMatrix(arr: number[][], m: number, n: number): Record<string, number> {
  const result: Record<string, number> = {};
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      result[`${i}-${j}`] = arr[i]?.[j] ?? 0;
    }
  }
  return result;
}

export const qr: BuiltinFn = async (args, _ctx) => {
  const A = args[0] ?? {};
  const which = Math.round(args[1]?.["0-0"] ?? 1); // 1=Q, 2=R

  const [m, n] = matSize(A);
  if (m === 0 || n === 0) return { "0-0": 0 };

  const arr = toArray2d(A, m, n);
  const { Q, R } = gramSchmidtQR(arr, m, n);

  if (which === 2) return fromArray2d(R);
  return colsToMatrix(Q, m, n);
};
