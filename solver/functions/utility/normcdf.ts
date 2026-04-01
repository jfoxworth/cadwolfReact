import type { BuiltinFn } from "../../types";
import { elementwise } from "../elementwise";

// Abramowitz & Stegun 7.1.26 erf approximation
function erfApprox(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const poly =
    t * (0.254829592 +
    t * (-0.284496736 +
    t * (1.421413741 +
    t * (-1.453152027 +
    t * 1.061405429))));
  const e = 1 - poly * Math.exp(-x * x);
  return x >= 0 ? e : -e;
}

// normcdf(x, mu?, sigma?) — CDF of the normal distribution
// normcdf(x) uses standard normal (mu=0, sigma=1)
export const normcdf: BuiltinFn = async (args, _ctx) => {
  const mu    = args[1]?.["0-0"] ?? 0;
  const sigma = args[2]?.["0-0"] ?? 1;
  return elementwise(args[0] ?? {}, (x) =>
    0.5 * (1 + erfApprox((x - mu) / (sigma * Math.SQRT2))));
};
