import type { BuiltinFn, Matrix } from "../../types";
import { betaInc } from "./prob-utils";

// fcdf(x, d1, d2) — F distribution CDF with d1 and d2 degrees of freedom.
// P(X ≤ x) = I_{d1*x/(d1*x+d2)}(d1/2, d2/2) for x ≥ 0.
function fCdfScalar(x: number, d1: number, d2: number): number {
  if (x <= 0) return 0;
  if (d1 <= 0 || d2 <= 0) return NaN;
  const z = d1 * x / (d1 * x + d2);
  return betaInc(d1 / 2, d2 / 2, z);
}

export const fcdf: BuiltinFn = async (args, _ctx) => {
  const X = args[0] ?? {};
  const d1Arg = args[1] ?? {};
  const d2Arg = args[2] ?? {};
  const d1Scalar = d1Arg["0-0"] ?? 1;
  const d2Scalar = d2Arg["0-0"] ?? 1;
  const result: Matrix = {};
  const singleD1 = Object.keys(d1Arg).length === 1;
  const singleD2 = Object.keys(d2Arg).length === 1;
  for (const [key, v] of Object.entries(X)) {
    const d1 = singleD1 ? d1Scalar : (d1Arg[key] ?? d1Scalar);
    const d2 = singleD2 ? d2Scalar : (d2Arg[key] ?? d2Scalar);
    result[key] = fCdfScalar(v, d1, d2);
  }
  return result;
};
