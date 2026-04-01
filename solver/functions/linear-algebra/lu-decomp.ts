import type { BuiltinFn, Matrix } from "../../types";

// luDecomp(A)  →  upper-triangular U from LU factorization (Doolittle, no pivoting)
// A must be square (n×n).
// Returns the packed result: upper triangle = U, lower triangle (below diagonal) = L factors.
// Diagonal of L is implicitly 1 (not stored). This matches the old code's primary output.
// Returns U as an n×n matrix (lower triangle zeroed out).
export const luDecomp: BuiltinFn = async (args, _ctx) => {
  const A = args[0] ?? {};
  const keys = Object.keys(A);
  if (keys.length === 0) return { "0-0": 0 };

  let n = 0;
  for (const k of keys) {
    const r = parseInt(k.split("-")[0], 10);
    if (r >= n) n = r + 1;
  }

  // Copy A into a working matrix
  const mat: number[][] = [];
  for (let r = 0; r < n; r++) {
    mat.push([]);
    for (let c = 0; c < n; c++) mat[r].push(A[`${r}-${c}`] ?? 0);
  }

  // Forward elimination (no pivoting — matching old code)
  for (let a = 0; a < n - 1; a++) {
    for (let b = a + 1; b < n; b++) {
      const factor = mat[a][a] !== 0 ? mat[b][a] / mat[a][a] : 0;
      for (let c = a; c < n; c++) mat[b][c] -= factor * mat[a][c];
    }
  }

  // Zero out lower triangle (return U)
  const result: Matrix = {};
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      result[`${r}-${c}`] = r > c ? 0 : mat[r][c];

  return result;
};
