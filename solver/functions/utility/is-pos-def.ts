import type { BuiltinFn } from "../../types";

// isPosDef(A)  →  1 if A is positive definite, 0 otherwise
// Uses Sylvester's criterion: A is positive definite iff all leading principal minors
// have positive determinant. Each minor's det is computed via LU decomposition.
// Returns scalar 1 (positive definite) or 0 (not positive definite).
export const isPosDef: BuiltinFn = async (args, _ctx) => {
  const A = args[0] ?? {};
  const keys = Object.keys(A);
  if (keys.length === 0) return { "0-0": 0 };

  let n = 0;
  for (const k of keys) {
    const r = parseInt(k.split("-")[0], 10);
    if (r >= n) n = r + 1;
  }

  // Check each leading principal minor of size ind×ind
  for (let ind = 1; ind <= n; ind++) {
    // Extract ind×ind submatrix and run LU (no pivoting)
    const mat: number[][] = [];
    for (let r = 0; r < ind; r++) {
      mat.push([]);
      for (let c = 0; c < ind; c++) mat[r].push(A[`${r}-${c}`] ?? 0);
    }

    for (let a = 0; a < ind - 1; a++) {
      for (let b = a + 1; b < ind; b++) {
        const factor = mat[a][a] !== 0 ? mat[b][a] / mat[a][a] : 0;
        for (let c = a; c < ind; c++) mat[b][c] -= factor * mat[a][c];
      }
    }

    // det = product of U diagonal (L is unit lower triangular → det = 1)
    let d = 1;
    for (let i = 0; i < ind; i++) d *= mat[i][i];

    if (d <= 0) return { "0-0": 0 };
  }

  return { "0-0": 1 };
};
