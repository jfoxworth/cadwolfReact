import type { BuiltinFn, Matrix } from "../../types";

// Jacobi eigenvalue algorithm (shared with eig.ts but inlined to avoid coupling)
function jacobiEig(input: number[][]): number[] {
  const n = input.length;
  const a = input.map((row) => [...row]);
  const MAX_ITER = 100 * n * n;

  for (let iter = 0; iter < MAX_ITER; iter++) {
    let maxVal = 0, p = 0, q = 1;
    for (let r = 0; r < n - 1; r++) {
      for (let c = r + 1; c < n; c++) {
        if (Math.abs(a[r][c]) > maxVal) { maxVal = Math.abs(a[r][c]); p = r; q = c; }
      }
    }
    if (maxVal < 1e-12) break;

    const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
    const t = Math.sign(theta) / (Math.abs(theta) + Math.sqrt(1 + theta * theta));
    const cosT = 1 / Math.sqrt(1 + t * t);
    const sinT = t * cosT;

    const newApp = a[p][p] - t * a[p][q];
    const newAqq = a[q][q] + t * a[p][q];
    a[p][p] = newApp;
    a[q][q] = newAqq;
    a[p][q] = 0;
    a[q][p] = 0;

    for (let r = 0; r < n; r++) {
      if (r === p || r === q) continue;
      const arp = a[r][p];
      const arq = a[r][q];
      a[r][p] = cosT * arp - sinT * arq;
      a[p][r] = a[r][p];
      a[r][q] = sinT * arp + cosT * arq;
      a[q][r] = a[r][q];
    }
  }

  return a.map((row, i) => row[i]);
}

// svd(A) — singular values of matrix A (returned as a row vector, sorted descending)
// Singular values are the square roots of eigenvalues of A^T * A.
export const svd: BuiltinFn = async (args, _ctx) => {
  const A = args[0] ?? {};

  let rows = 0, cols = 0;
  for (const k of Object.keys(A)) {
    const [r, c] = k.split("-").map(Number);
    if (r >= rows) rows = r + 1;
    if (c >= cols) cols = c + 1;
  }
  if (rows === 0 || cols === 0) return { "0-0": 0 };

  // Build A^T * A  (cols × cols symmetric positive semi-definite)
  const AtA: number[][] = Array.from({ length: cols }, () => new Array(cols).fill(0));
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < cols; j++) {
      let s = 0;
      for (let k = 0; k < rows; k++) s += (A[`${k}-${i}`] ?? 0) * (A[`${k}-${j}`] ?? 0);
      AtA[i][j] = s;
    }
  }

  const singularValues = jacobiEig(AtA)
    .map((e) => Math.sqrt(Math.max(0, e)))
    .sort((a, b) => b - a);

  const result: Matrix = {};
  singularValues.forEach((sv, i) => { result[`0-${i}`] = sv; });
  return result;
};
