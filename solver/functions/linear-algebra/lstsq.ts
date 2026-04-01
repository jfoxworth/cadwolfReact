import type { BuiltinFn, Matrix } from "../../types";
import {
  matSize, toArray2d, fromArray2d,
  mul2d, transpose2d, luSolve,
} from "./mat-utils";

// lstsq(A, b) — least-squares solution to A·x ≈ b
//
// Solves the normal equations: (AᵀA) x = Aᵀb
// Returns x as a column vector.
// If AᵀA is singular (underdetermined or rank-deficient), returns a zero vector.
export const lstsq: BuiltinFn = async (args, _ctx) => {
  const A = args[0] ?? {};
  const b = args[1] ?? {};

  const [m, n] = matSize(A);
  if (m === 0 || n === 0) return { "0-0": 0 };

  const arr = toArray2d(A, m, n);
  const AT = transpose2d(arr);               // n×m

  // Build b as a column vector (length m)
  const bVec: number[] = Array.from({ length: m }, (_, i) => b[`${i}-0`] ?? b[`0-${i}`] ?? 0);

  // Normal equations: (AᵀA) x = Aᵀb
  const ATA = mul2d(AT, arr);               // n×n
  const ATb = AT.map(row => row.reduce((s, v, j) => s + v * bVec[j]!, 0)); // n

  const x = luSolve(ATA, ATb);
  if (!x) {
    const zero: Matrix = {};
    for (let i = 0; i < n; i++) zero[`${i}-0`] = 0;
    return zero;
  }

  const result: Matrix = {};
  x.forEach((v, i) => { result[`${i}-0`] = v; });
  return result;
};
