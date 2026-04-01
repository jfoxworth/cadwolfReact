import type { BuiltinFn, Matrix } from "../../types";
import { betaInc, cdfInverse } from "./prob-utils";

function tCdf(t: number, df: number): number {
  const x = df / (df + t * t);
  const ib = betaInc(df / 2, 0.5, x);
  return t >= 0 ? 1 - 0.5 * ib : 0.5 * ib;
}

// tinv(p, df) — inverse Student's t CDF: t such that P(T ≤ t) = p.
function tInvScalar(p: number, df: number): number {
  if (df <= 0 || p <= 0 || p >= 1) return NaN;
  // Search range: t CDF is monotone from -∞ to +∞; use ±1000*sqrt(df) as bounds
  const bound = Math.max(100, 10 * Math.sqrt(df));
  return cdfInverse(t => tCdf(t, df), p, -bound, bound);
}

export const tinv: BuiltinFn = async (args, _ctx) => {
  const P = args[0] ?? {};
  const dfArg = args[1] ?? {};
  const dfScalar = dfArg["0-0"] ?? 1;
  const result: Matrix = {};
  for (const [k, v] of Object.entries(P)) {
    const df = Object.keys(dfArg).length === 1 ? dfScalar : (dfArg[k] ?? dfScalar);
    result[k] = tInvScalar(v, df);
  }
  return result;
};
