import type { BuiltinFn } from "../../types";

// skewness(v) — sample skewness (third standardized moment, bias-corrected)
export const skewness: BuiltinFn = async (args, _ctx) => {
  const vals = Object.values(args[0] ?? {});
  const n = vals.length;
  if (n < 3) return { "0-0": NaN };
  const mu = vals.reduce((a, b) => a + b, 0) / n;
  const m2 = vals.reduce((a, v) => a + (v - mu) ** 2, 0) / n;
  const m3 = vals.reduce((a, v) => a + (v - mu) ** 3, 0) / n;
  if (m2 === 0) return { "0-0": 0 };
  // Bias-corrected (Fisher's formula, matches MATLAB skewness with flag=0)
  const g1 = m3 / m2 ** 1.5;
  const corrected = g1 * Math.sqrt(n * (n - 1)) / (n - 2);
  return { "0-0": corrected };
};
