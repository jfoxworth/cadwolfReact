import type { BuiltinFn, Matrix } from "../../types";

// Jacobi eigenvalue algorithm for real symmetric matrices.
// Iteratively applies Givens rotations until off-diagonal elements are negligible.
// Returns eigenvalues as a row vector (unsorted).
function jacobiEig(input: number[][]): number[] {
  const n = input.length;
  // Deep copy so we don't mutate the caller's array
  const a = input.map((row) => [...row]);
  const MAX_ITER = 100 * n * n;

  for (let iter = 0; iter < MAX_ITER; iter++) {
    // Find the largest off-diagonal |element|
    let maxVal = 0, p = 0, q = 1;
    for (let r = 0; r < n - 1; r++) {
      for (let c = r + 1; c < n; c++) {
        if (Math.abs(a[r][c]) > maxVal) { maxVal = Math.abs(a[r][c]); p = r; q = c; }
      }
    }
    if (maxVal < 1e-12) break;

    // Givens rotation angle
    const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
    const t = Math.sign(theta) / (Math.abs(theta) + Math.sqrt(1 + theta * theta));
    const cosT = 1 / Math.sqrt(1 + t * t);
    const sinT = t * cosT;

    // Update diagonal and zero the pivot
    const newApp = a[p][p] - t * a[p][q];
    const newAqq = a[q][q] + t * a[p][q];
    a[p][p] = newApp;
    a[q][q] = newAqq;
    a[p][q] = 0;
    a[q][p] = 0;

    // Update remaining rows/cols
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

// eig(A) — eigenvalues of a real symmetric matrix A
// Returns a row vector of eigenvalues (sorted descending by magnitude).
export const eig: BuiltinFn = async (args, _ctx) => {
  const A = args[0] ?? {};

  let n = 0;
  for (const k of Object.keys(A)) {
    const r = parseInt(k.split("-")[0], 10);
    if (r >= n) n = r + 1;
  }
  if (n === 0) return { "0-0": 0 };

  const mat: number[][] = [];
  for (let r = 0; r < n; r++) {
    mat.push([]);
    for (let c = 0; c < n; c++) mat[r].push(A[`${r}-${c}`] ?? 0);
  }

  const eigenvalues = jacobiEig(mat).sort((a, b) => Math.abs(b) - Math.abs(a));

  const result: Matrix = {};
  eigenvalues.forEach((v, i) => { result[`0-${i}`] = v; });
  return result;
};
