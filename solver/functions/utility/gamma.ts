import type { BuiltinFn } from "../../types";
import { elementwise } from "../elementwise";

// Lanczos approximation (g=7, n=9 coefficients) — max error ~1e-15
const GAMMA_G = 7;
const GAMMA_C = [
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

function gammaApprox(z: number): number {
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gammaApprox(1 - z));
  z -= 1;
  let x = GAMMA_C[0];
  for (let i = 1; i < GAMMA_G + 2; i++) x += GAMMA_C[i] / (z + i);
  const t = z + GAMMA_G + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

// gamma(x) — gamma function Γ(x)
export const gamma: BuiltinFn = async (args) =>
  elementwise(args[0] ?? {}, gammaApprox);
