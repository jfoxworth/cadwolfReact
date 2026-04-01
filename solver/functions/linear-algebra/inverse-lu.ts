import type { BuiltinFn, Matrix } from "../../types";

// inverseLu(A)  →  A^(-1) computed via LU decomposition (Doolittle, no pivoting)
// A must be square (n×n).
// Returns the n×n inverse matrix.
export const inverseLu: BuiltinFn = async (args, _ctx) => {
  const A = args[0] ?? {};
  const keys = Object.keys(A);
  if (keys.length === 0) return { "0-0": 0 };

  let n = 0;
  for (const k of keys) {
    const r = parseInt(k.split("-")[0], 10);
    if (r >= n) n = r + 1;
  }

  // Copy A and compute LU (Doolittle, no pivoting)
  const upper: number[][] = [];
  const lower: number[][] = [];
  for (let r = 0; r < n; r++) {
    upper.push([]);
    lower.push([]);
    for (let c = 0; c < n; c++) {
      upper[r].push(A[`${r}-${c}`] ?? 0);
      lower[r].push(r === c ? 1 : 0);
    }
  }

  for (let a = 0; a < n - 1; a++) {
    for (let b = a + 1; b < n; b++) {
      const factor = upper[a][a] !== 0 ? upper[b][a] / upper[a][a] : 0;
      for (let c = a; c < n; c++) upper[b][c] -= factor * upper[a][c];
      lower[b][a] = factor;
    }
  }

  // For each column of identity, solve L*D=e then U*x=D
  const inv: Matrix = {};
  for (let col = 0; col < n; col++) {
    // Forward substitution: L * D = e_col
    const D: number[] = new Array(n).fill(0);
    for (let a = 0; a < n; a++) {
      let tmp = col === a ? 1 : 0;
      for (let b = 0; b < a; b++) tmp -= lower[a][b] * D[b];
      D[a] = lower[a][a] !== 0 ? tmp / lower[a][a] : tmp;
    }

    // Back substitution: U * x = D
    const x: number[] = new Array(n).fill(0);
    for (let a = n - 1; a >= 0; a--) {
      let tmp = D[a];
      for (let b = a + 1; b < n; b++) tmp -= upper[a][b] * x[b];
      x[a] = upper[a][a] !== 0 ? tmp / upper[a][a] : 0;
    }

    for (let r = 0; r < n; r++) inv[`${r}-${col}`] = x[r];
  }

  return inv;
};
