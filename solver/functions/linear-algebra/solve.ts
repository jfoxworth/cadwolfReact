import type { BuiltinFn, Matrix } from "../../types";

// solve(A, b) — solves the linear system A*x = b via Gaussian elimination
// with partial pivoting. A must be square (n×n); b must be n×1.
// Returns an n×1 column vector x.
export const solve: BuiltinFn = async (args, _ctx) => {
  const A = args[0] ?? {};
  const b = args[1] ?? {};

  let n = 0;
  for (const k of Object.keys(A)) {
    const r = parseInt(k.split("-")[0], 10);
    if (r >= n) n = r + 1;
  }
  if (n === 0) return { "0-0": 0 };

  // Augmented matrix [A | b]
  const m: number[][] = [];
  for (let r = 0; r < n; r++) {
    const row: number[] = [];
    for (let c = 0; c < n; c++) row.push(A[`${r}-${c}`] ?? 0);
    row.push(b[`${r}-0`] ?? 0);
    m.push(row);
  }

  // Forward elimination with partial pivoting
  for (let a = 0; a < n - 1; a++) {
    let maxVal = Math.abs(m[a][a]), pivotRow = a;
    for (let r = a + 1; r < n; r++) {
      if (Math.abs(m[r][a]) > maxVal) { maxVal = Math.abs(m[r][a]); pivotRow = r; }
    }
    if (pivotRow !== a) [m[a], m[pivotRow]] = [m[pivotRow], m[a]];

    for (let r = a + 1; r < n; r++) {
      const factor = m[a][a] !== 0 ? m[r][a] / m[a][a] : 0;
      for (let c = a; c <= n; c++) m[r][c] -= factor * m[a][c];
    }
  }

  // Back substitution
  const x: number[] = new Array(n).fill(0);
  x[n - 1] = m[n - 1][n - 1] !== 0 ? m[n - 1][n] / m[n - 1][n - 1] : 0;
  for (let a = n - 2; a >= 0; a--) {
    let sum = 0;
    for (let c = a + 1; c < n; c++) sum += m[a][c] * x[c];
    x[a] = m[a][a] !== 0 ? (m[a][n] - sum) / m[a][a] : 0;
  }

  const result: Matrix = {};
  for (let i = 0; i < n; i++) result[`${i}-0`] = x[i];
  return result;
};
