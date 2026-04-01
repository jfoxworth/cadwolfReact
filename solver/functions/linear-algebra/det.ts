import type { BuiltinFn } from "../../types";

// det(A)  →  determinant of square matrix A
// Uses LU decomposition (Doolittle, no pivoting): det(A) = det(L) * det(U) = prod(U diagonal)
// since det(L) = 1 for Doolittle (unit lower triangular).
export const det: BuiltinFn = async (args, _ctx) => {
  const A = args[0] ?? {};
  const keys = Object.keys(A);
  if (keys.length === 0) return { "0-0": 0 };

  let n = 0;
  for (const k of keys) {
    const r = parseInt(k.split("-")[0], 10);
    if (r >= n) n = r + 1;
  }

  // Copy into working matrix
  const mat: number[][] = [];
  for (let r = 0; r < n; r++) {
    mat.push([]);
    for (let c = 0; c < n; c++) mat[r].push(A[`${r}-${c}`] ?? 0);
  }

  // Forward elimination (no pivoting — matches old code)
  for (let a = 0; a < n - 1; a++) {
    for (let b = a + 1; b < n; b++) {
      const factor = mat[a][a] !== 0 ? mat[b][a] / mat[a][a] : 0;
      for (let c = a; c < n; c++) mat[b][c] -= factor * mat[a][c];
    }
  }

  // det = product of U diagonal (L diagonal is all 1s)
  let d = 1;
  for (let i = 0; i < n; i++) d *= mat[i][i];

  return { "0-0": d };
};
