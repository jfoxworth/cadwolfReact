import type { BuiltinFn } from "../../types";
import {
  matSize, toArray2d, fromArray2d,
  mul2d, add2d, scale2d, identity2d, norm12d,
} from "./mat-utils";

// expm(A) — matrix exponential e^A
//
// Uses the scaling-and-squaring method with Taylor series (20 terms):
//   1. Find s = ceil(log2(||A||_1)) so that ||A/2^s||_1 < 1
//   2. Compute e^(A/2^s) via Taylor: I + B + B²/2! + … (up to 20 terms)
//   3. Recover e^A by repeated squaring: result = (e^(A/2^s))^(2^s)
export const expm: BuiltinFn = async (args, _ctx) => {
  const A = args[0] ?? {};
  const [m, n] = matSize(A);
  if (m === 0 || n === 0) return { "0-0": 1 };
  if (m !== n) throw new Error("expm: matrix must be square");

  let arr = toArray2d(A, n, n);

  // Scaling
  const normA = norm12d(arr);
  const s = normA > 0 ? Math.max(0, Math.ceil(Math.log2(normA))) : 0;
  if (s > 0) arr = scale2d(arr, 1 / Math.pow(2, s));

  // Taylor series: e^B = sum_{k=0}^{N} B^k / k!
  const N = 20;
  let result = identity2d(n);      // accumulator (starts at I)
  let term = identity2d(n);        // current term B^k / k!
  for (let k = 1; k <= N; k++) {
    term = scale2d(mul2d(term, arr), 1 / k);
    result = add2d(result, term);
    // Early exit when term is negligible
    if (norm12d(term) < 1e-16 * norm12d(result)) break;
  }

  // Repeated squaring to undo scaling
  for (let i = 0; i < s; i++) result = mul2d(result, result);

  return fromArray2d(result);
};
