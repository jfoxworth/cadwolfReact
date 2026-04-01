import type { BuiltinFn } from "../../types";
import { elementwise } from "../elementwise";

// Abramowitz & Stegun 7.1.26 — same approximation used by erf.ts
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

// erfc(x) = 1 - erf(x)
export const erfc: BuiltinFn = async (args) =>
  elementwise(args[0] ?? {}, (v) => 1 - erfApprox(v));
