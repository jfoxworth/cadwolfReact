import type { BuiltinFn, Matrix } from "../../types";

// expcdf(x, mu) — Exponential distribution CDF: P(X ≤ x) = 1 - e^{-x/mu}.
// mu is the mean (= 1/rate). Default mu = 1.
function expCdfScalar(x: number, mu: number): number {
  if (x <= 0) return 0;
  if (mu <= 0) return NaN;
  return 1 - Math.exp(-x / mu);
}

export const expcdf: BuiltinFn = async (args, _ctx) => {
  const X = args[0] ?? {};
  const muArg = args[1] ?? {};
  const muScalar = muArg["0-0"] ?? 1;
  const result: Matrix = {};
  const singleMu = Object.keys(muArg).length <= 1;
  for (const [key, v] of Object.entries(X)) {
    const mu = singleMu ? muScalar : (muArg[key] ?? muScalar);
    result[key] = expCdfScalar(v, mu);
  }
  return result;
};
