import type { BuiltinFn, Matrix } from "../../types";
import { regIncGammaUpper } from "./prob-utils";

// poisscdf(k, lambda) — Poisson CDF: P(X ≤ k) = Q(k+1, lambda) = upper regularized gamma.
// This is equivalent to 1 - regIncGamma(k+1, lambda).
function poissCdfScalar(k: number, lambda: number): number {
  k = Math.floor(k);
  if (k < 0) return 0;
  if (lambda <= 0) return 1;
  return regIncGammaUpper(k + 1, lambda);
}

export const poisscdf: BuiltinFn = async (args, _ctx) => {
  const K = args[0] ?? {};
  const lambdaArg = args[1] ?? {};
  const lambdaScalar = lambdaArg["0-0"] ?? 1;
  const result: Matrix = {};
  const singleLambda = Object.keys(lambdaArg).length === 1;
  for (const [key, v] of Object.entries(K)) {
    const lambda = singleLambda ? lambdaScalar : (lambdaArg[key] ?? lambdaScalar);
    result[key] = poissCdfScalar(v, lambda);
  }
  return result;
};
