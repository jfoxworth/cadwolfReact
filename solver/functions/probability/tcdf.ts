import type { BuiltinFn, Matrix } from "../../types";
import { betaInc } from "./prob-utils";

// tcdf(t, df) — Student's t CDF: P(T ≤ t) for T ~ t(df).
// Uses the relationship to the regularized incomplete beta:
//   P(T ≤ t) = 1 - 0.5 * I_{df/(df+t²)}(df/2, 1/2)  for t ≥ 0
//   P(T ≤ t) = 0.5 * I_{df/(df+t²)}(df/2, 1/2)        for t < 0
function tCdfScalar(t: number, df: number): number {
  if (df <= 0) return NaN;
  const x = df / (df + t * t);
  const ib = betaInc(df / 2, 0.5, x);
  return t >= 0 ? 1 - 0.5 * ib : 0.5 * ib;
}

export const tcdf: BuiltinFn = async (args, _ctx) => {
  const T = args[0] ?? {};
  const dfArg = args[1] ?? {};
  const dfScalar = dfArg["0-0"] ?? 1;
  const result: Matrix = {};
  for (const [k, v] of Object.entries(T)) {
    const df = Object.keys(dfArg).length === 1 ? dfScalar : (dfArg[k] ?? dfScalar);
    result[k] = tCdfScalar(v, df);
  }
  return result;
};
