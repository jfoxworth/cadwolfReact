import type { BuiltinFn } from "../../types";
import {
  matSize, toArray2d, fromArray2d,
  mul2d, transpose2d, invertMatrix,
} from "./mat-utils";

// pinv(A) — Moore-Penrose pseudoinverse
//
// For a tall or square full-rank matrix (m >= n):
//   A⁺ = (AᵀA)⁻¹ Aᵀ
// For a fat full-rank matrix (m < n):
//   A⁺ = Aᵀ (AAᵀ)⁻¹
//
// Falls back to zero matrix if A is singular or empty.
export const pinv: BuiltinFn = async (args, _ctx) => {
  const A = args[0] ?? {};
  const [m, n] = matSize(A);
  if (m === 0 || n === 0) return { "0-0": 0 };

  const arr = toArray2d(A, m, n);
  const AT = transpose2d(arr);

  if (m >= n) {
    // (AᵀA)⁻¹ Aᵀ  — result is n×m
    const ATA = mul2d(AT, arr);          // n×n
    const ATAinv = invertMatrix(ATA);
    if (!ATAinv) return fromArray2d(Array.from({ length: n }, () => new Array(m).fill(0)));
    return fromArray2d(mul2d(ATAinv, AT));
  } else {
    // Aᵀ (AAᵀ)⁻¹  — result is n×m
    const AAT = mul2d(arr, AT);          // m×m
    const AATinv = invertMatrix(AAT);
    if (!AATinv) return fromArray2d(Array.from({ length: n }, () => new Array(m).fill(0)));
    return fromArray2d(mul2d(AT, AATinv));
  }
};
