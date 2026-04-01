import type { BuiltinFn, Matrix } from "../../types";
import { regIncGamma } from "./prob-utils";

// chi2cdf(x, k) — chi-squared CDF with k degrees of freedom.
// P(X ≤ x) = P(k/2, x/2) = regIncGamma(k/2, x/2).
function chi2CdfScalar(x: number, k: number): number {
  if (x <= 0) return 0;
  if (k <= 0) return NaN;
  return regIncGamma(k / 2, x / 2);
}

export const chi2cdf: BuiltinFn = async (args, _ctx) => {
  const X = args[0] ?? {};
  const kArg = args[1] ?? {};
  const kScalar = kArg["0-0"] ?? 1;
  const result: Matrix = {};
  for (const [key, v] of Object.entries(X)) {
    const k = Object.keys(kArg).length === 1 ? kScalar : (kArg[key] ?? kScalar);
    result[key] = chi2CdfScalar(v, k);
  }
  return result;
};
