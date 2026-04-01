import type { BuiltinFn, Matrix } from "../../types";
import { lgammaScalar } from "./prob-utils";

// binopdf(k, n, p) — Binomial PMF: P(X = k) = C(n,k) * p^k * (1-p)^(n-k).
// Uses log-space computation to avoid overflow for large n.
function binoPdfScalar(k: number, n: number, p: number): number {
  k = Math.round(k);
  n = Math.round(n);
  if (k < 0 || k > n || n < 0 || p < 0 || p > 1) return 0;
  if (p === 0) return k === 0 ? 1 : 0;
  if (p === 1) return k === n ? 1 : 0;
  // log C(n,k) = lgamma(n+1) - lgamma(k+1) - lgamma(n-k+1)
  const logPmf =
    lgammaScalar(n + 1) - lgammaScalar(k + 1) - lgammaScalar(n - k + 1) +
    k * Math.log(p) + (n - k) * Math.log(1 - p);
  return Math.exp(logPmf);
}

export const binopdf: BuiltinFn = async (args, _ctx) => {
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
    result[key] = binoPdfScalar(v, n, p);
  }
  return result;
};
