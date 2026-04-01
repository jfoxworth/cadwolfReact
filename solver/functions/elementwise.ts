import type { Matrix } from "../types";

/**
 * Apply a scalar math function to every element of a Matrix.
 * This is the correct way to implement any unary function (sin, cos, abs, etc.)
 * that must work on both scalars and vectors/matrices.
 */
export function elementwise(mat: Matrix, fn: (v: number) => number): Matrix {
  const result: Matrix = {};
  for (const key of Object.keys(mat)) {
    result[key] = fn(mat[key] ?? 0);
  }
  return result;
}
