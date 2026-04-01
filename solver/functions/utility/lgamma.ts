import type { BuiltinFn } from "../../types";
import { elementwise } from "../elementwise";

// Lanczos approximation — log of gamma function
const LGAMMA_G = 7;
const LGAMMA_C = [
  0.99999999999980993,
  676.5203681218851,
  -1259.1392167224028,
  771.32342877765313,
  -176.61502916214059,
  12.507343278686905,
  -0.13857109526572012,
  9.9843695780195716e-6,
  1.5056327351493116e-7,
];

function lgammaApprox(z: number): number {
  if (z < 0.5) {
    // Use reflection: log|Γ(z)| = log(π) - log|sin(πz)| - lgamma(1-z)
    return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * z))) - lgammaApprox(1 - z);
  }
  z -= 1;
  let x = LGAMMA_C[0];
  for (let i = 1; i < LGAMMA_G + 2; i++) x += LGAMMA_C[i] / (z + i);
  const t = z + LGAMMA_G + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

// lgamma(x) — natural log of Γ(x)
export const lgamma: BuiltinFn = async (args) =>
  elementwise(args[0] ?? {}, lgammaApprox);
