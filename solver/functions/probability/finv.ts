import type { BuiltinFn, Matrix } from "../../types";
import { betaInc, cdfInverse } from "./prob-utils";

function fCdf(x: number, d1: number, d2: number): number {
  if (x <= 0) return 0;
  const z = d1 * x / (d1 * x + d2);
  return betaInc(d1 / 2, d2 / 2, z);
}

// finv(p, d1, d2) — inverse F distribution CDF.
function fInvScalar(p: number, d1: number, d2: number): number {
  if (d1 <= 0 || d2 <= 0 || p < 0 || p >= 1) return NaN;
  if (p === 0) return 0;
  // Upper bound: heuristic — use large multiple of d1/d2 ratio
  const hi = Math.max(100, (d1 / d2) * 50 + 50);
  return cdfInverse(x => fCdf(x, d1, d2), p, 0, hi);
}

export const finv: BuiltinFn = async (args, _ctx) => {
  const P = args[0] ?? {};
  const d1Arg = args[1] ?? {};
  const d2Arg = args[2] ?? {};
  const d1Scalar = d1Arg["0-0"] ?? 1;
  const d2Scalar = d2Arg["0-0"] ?? 1;
  const result: Matrix = {};
  const singleD1 = Object.keys(d1Arg).length === 1;
  const singleD2 = Object.keys(d2Arg).length === 1;
  for (const [key, v] of Object.entries(P)) {
    const d1 = singleD1 ? d1Scalar : (d1Arg[key] ?? d1Scalar);
    const d2 = singleD2 ? d2Scalar : (d2Arg[key] ?? d2Scalar);
    result[key] = fInvScalar(v, d1, d2);
  }
  return result;
};
