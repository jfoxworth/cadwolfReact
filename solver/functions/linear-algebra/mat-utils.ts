import type { Matrix } from "../../types";

// ---------------------------------------------------------------------------
// Matrix size / element helpers
// ---------------------------------------------------------------------------

export function matSize(A: Matrix): [number, number] {
  let rows = 0, cols = 0;
  for (const k of Object.keys(A)) {
    const [r, c] = k.split("-").map(Number);
    if (r + 1 > rows) rows = r + 1;
    if (c + 1 > cols) cols = c + 1;
  }
  return [rows, cols];
}

export function toArray2d(A: Matrix, rows: number, cols: number): number[][] {
  return Array.from({ length: rows }, (_, i) =>
    Array.from({ length: cols }, (_, j) => A[`${i}-${j}`] ?? 0)
  );
}

export function fromArray2d(arr: number[][]): Matrix {
  const result: Matrix = {};
  for (let i = 0; i < arr.length; i++) {
    for (let j = 0; j < (arr[i]?.length ?? 0); j++) {
      result[`${i}-${j}`] = arr[i]?.[j] ?? 0;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// 2-D array arithmetic (all operate on plain number[][])
// ---------------------------------------------------------------------------

export function mul2d(A: number[][], B: number[][]): number[][] {
  const m = A.length;
  const p = A[0]?.length ?? 0;
  const n = B[0]?.length ?? 0;
  return Array.from({ length: m }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      let s = 0;
      for (let k = 0; k < p; k++) s += (A[i]?.[k] ?? 0) * (B[k]?.[j] ?? 0);
      return s;
    })
  );
}

export function transpose2d(A: number[][]): number[][] {
  const m = A.length;
  const n = A[0]?.length ?? 0;
  return Array.from({ length: n }, (_, j) =>
    Array.from({ length: m }, (_, i) => A[i]?.[j] ?? 0)
  );
}

export function add2d(A: number[][], B: number[][]): number[][] {
  return A.map((row, i) => row.map((v, j) => v + (B[i]?.[j] ?? 0)));
}

export function scale2d(A: number[][], s: number): number[][] {
  return A.map(row => row.map(v => v * s));
}

export function identity2d(n: number): number[][] {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  );
}

// 1-norm of a matrix (max absolute column sum)
export function norm12d(A: number[][]): number {
  const m = A.length;
  const n = A[0]?.length ?? 0;
  let best = 0;
  for (let j = 0; j < n; j++) {
    let s = 0;
    for (let i = 0; i < m; i++) s += Math.abs(A[i]?.[j] ?? 0);
    if (s > best) best = s;
  }
  return best;
}

// ---------------------------------------------------------------------------
// Gaussian elimination with partial pivoting — solve A x = b
// Returns x, or null if A is singular.
// ---------------------------------------------------------------------------
export function luSolve(A: number[][], b: number[]): number[] | null {
  const n = A.length;
  const M: number[][] = A.map((row, i) => [...row, b[i] ?? 0]);

  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row]?.[col] ?? 0) > Math.abs(M[maxRow]?.[col] ?? 0)) maxRow = row;
    }
    [M[col], M[maxRow]] = [M[maxRow]!, M[col]!];
    if (Math.abs(M[col]?.[col] ?? 0) < 1e-14) return null;
    for (let row = col + 1; row < n; row++) {
      const f = (M[row]?.[col] ?? 0) / M[col]![col]!;
      for (let k = col; k <= n; k++) (M[row] as number[])[k] -= f * (M[col]?.[k] ?? 0);
    }
  }

  const x = new Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = M[i]?.[n] ?? 0;
    for (let j = i + 1; j < n; j++) x[i] -= (M[i]?.[j] ?? 0) * x[j]!;
    x[i] /= M[i]?.[i] ?? 1;
  }
  return x;
}

// ---------------------------------------------------------------------------
// Invert a square matrix via Gauss-Jordan elimination.
// Returns null if singular.
// ---------------------------------------------------------------------------
export function invertMatrix(A: number[][]): number[][] | null {
  const n = A.length;
  const M: number[][] = A.map((row, i) => {
    const aug = new Array<number>(n).fill(0);
    aug[i] = 1;
    return [...row, ...aug];
  });

  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row]?.[col] ?? 0) > Math.abs(M[maxRow]?.[col] ?? 0)) maxRow = row;
    }
    [M[col], M[maxRow]] = [M[maxRow]!, M[col]!];
    if (Math.abs(M[col]?.[col] ?? 0) < 1e-14) return null;
    const pivot = M[col]![col]!;
    for (let k = col; k < 2 * n; k++) (M[col] as number[])[k] /= pivot;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const f = M[row]?.[col] ?? 0;
      for (let k = col; k < 2 * n; k++) (M[row] as number[])[k] -= f * (M[col]?.[k] ?? 0);
    }
  }

  return M.map(row => row.slice(n));
}
