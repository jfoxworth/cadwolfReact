import type { BuiltinFn, Matrix } from "../../types";
import { regIncGamma, cdfInverse } from "./prob-utils";

function chi2Cdf(x: number, k: number): number {
  return x <= 0 ? 0 : regIncGamma(k / 2, x / 2);
}

// chi2inv(p, k) — inverse chi-squared CDF: x such that P(X ≤ x) = p.
function chi2InvScalar(p: number, k: number): number {
  if (k <= 0 || p < 0 || p >= 1) return NaN;
  if (p === 0) return 0;
  // Upper bound: use chi-squared mean + 10*std = k + 10*sqrt(2k)
  const hi = Math.max(k + 10 * Math.sqrt(2 * k), 50);
  return cdfInverse(x => chi2Cdf(x, k), p, 0, hi * 4);
}

export const chi2inv: BuiltinFn = async (args, _ctx) => {
  const P = args[0] ?? {};
  const kArg = args[1] ?? {};
  const kScalar = kArg["0-0"] ?? 1;
  const result: Matrix = {};
  for (const [key, v] of Object.entries(P)) {
    const k = Object.keys(kArg).length === 1 ? kScalar : (kArg[key] ?? kScalar);
    result[key] = chi2InvScalar(v, k);
  }
  return result;
};
