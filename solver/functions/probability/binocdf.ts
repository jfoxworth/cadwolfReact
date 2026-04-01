import type { BuiltinFn, Matrix } from "../../types";
import { betaInc } from "./prob-utils";

// binocdf(k, n, p) — Binomial CDF: P(X ≤ k).
// Uses the regularized incomplete beta: P(X ≤ k) = I_{1-p}(n-k, k+1) for k < n.
function binoCdfScalar(k: number, n: number, p: number): number {
  k = Math.floor(k);
  n = Math.round(n);
  if (k < 0 || n <= 0 || p < 0 || p > 1) return k < 0 ? 0 : 1;
  if (p === 0) return 1;
  if (p === 1) return k >= n ? 1 : 0;
  if (k >= n) return 1;
  return betaInc(n - k, k + 1, 1 - p);
}

export const binocdf: BuiltinFn = async (args, _ctx) => {
  const K = args[0] ?? {};
  const nArg = args[1] ?? {};
  const pArg = args[2] ?? {};
  const nScalar = nArg["0-0"] ?? 1;
  const pScalar = pArg["0-0"] ?? 0.5;
  const result: Matrix = {};
  const singleN = Object.keys(nArg).length === 1;
  const singleP = Object.keys(pArg).length === 1;
  for (const [key, v] of Object.entries(K)) {
    const n = singleN ? nScalar : (nArg[key] ?? nScalar);
    const p = singleP ? pScalar : (pArg[key] ?? pScalar);
    result[key] = binoCdfScalar(v, n, p);
  }
  return result;
};
