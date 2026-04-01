import type { BuiltinFn, Matrix } from "../../types";
import { matSize, toArray2d } from "./mat-utils";

// Reduced row echelon form via Gauss-Jordan with partial pivoting.
// Returns the RREF matrix and the list of pivot column indices.
function rref(arr: number[][], rows: number, cols: number): { mat: number[][], pivotCols: number[] } {
  const mat = arr.map(row => [...row]);
  const pivotCols: number[] = [];
  let pivotRow = 0;

  for (let col = 0; col < cols && pivotRow < rows; col++) {
    // Find the largest magnitude in this column from pivotRow downward
    let maxVal = 0, maxR = -1;
    for (let r = pivotRow; r < rows; r++) {
      const v = Math.abs(mat[r]?.[col] ?? 0);
      if (v > maxVal) { maxVal = v; maxR = r; }
    }
    if (maxVal < 1e-10) continue; // no pivot here — free variable

    // Swap rows
    [mat[pivotRow], mat[maxR]] = [mat[maxR] as number[], mat[pivotRow] as number[]];

    // Scale pivot row to 1
    const scale = mat[pivotRow]![col]!;
    for (let c = 0; c < cols; c++) (mat[pivotRow] as number[])[c] /= scale;

    // Eliminate all other rows
    for (let r = 0; r < rows; r++) {
      if (r === pivotRow) continue;
      const factor = mat[r]![col]!;
      for (let c = 0; c < cols; c++) {
        (mat[r] as number[])[c] -= factor * (mat[pivotRow]![c] ?? 0);
      }
    }

    pivotCols.push(col);
    pivotRow++;
  }
  return { mat, pivotCols };
}

// null-space(A) — returns a matrix whose columns form an orthonormal-ish basis for null(A).
// Uses RREF to find the free variables and express the null vectors.
// If the null space is trivial ({0}), returns a zero column of length n.
export const nullSpace: BuiltinFn = async (args, _ctx) => {
  const A = args[0] ?? {};
  const [m, n] = matSize(A);
  if (m === 0 || n === 0) return { "0-0": 0 };

  const arr = toArray2d(A, m, n);
  const { mat, pivotCols } = rref(arr, m, n);

  const pivotSet = new Set(pivotCols);
  const freeCols = Array.from({ length: n }, (_, i) => i).filter(i => !pivotSet.has(i));

  const result: Matrix = {};

  if (freeCols.length === 0) {
    // Trivial null space — return a zero column vector of length n
    for (let i = 0; i < n; i++) result[`${i}-0`] = 0;
    return result;
  }

  // One null basis vector per free variable
  for (let fc = 0; fc < freeCols.length; fc++) {
    const freeCol = freeCols[fc]!;
    const vec = new Array(n).fill(0);
    vec[freeCol] = 1;
    // Express pivot variables in terms of this free variable
    for (let pi = 0; pi < pivotCols.length; pi++) {
      const pc = pivotCols[pi]!;
      vec[pc] = -(mat[pi]?.[freeCol] ?? 0);
    }
    for (let i = 0; i < n; i++) result[`${i}-${fc}`] = vec[i] ?? 0;
  }
  return result;
};
