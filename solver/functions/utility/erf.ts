import type { BuiltinFn, Matrix } from "../../types";

// Abramowitz & Stegun approximation 7.1.26 — max error |ε| ≤ 1.5×10⁻⁷
function erfScalar(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const poly =
    t * (0.254829592 +
    t * (-0.284496736 +
    t * (1.421413741 +
    t * (-1.453152027 +
    t * 1.061405429))));
  return sign * (1 - poly * Math.exp(-ax * ax));
}

export const erf: BuiltinFn = async (args, _ctx) => {
  const mat = args[0] ?? {};
  const result: Matrix = {};
  for (const [key, val] of Object.entries(mat)) {
    result[key] = erfScalar(val);
  }
  return result;
};
