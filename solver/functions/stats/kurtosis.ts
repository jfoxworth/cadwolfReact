import type { BuiltinFn } from "../../types";

// kurtosis(v) — excess kurtosis (fourth standardized moment minus 3, bias-corrected)
// Returns 0 for a normal distribution (excess kurtosis convention).
export const kurtosis: BuiltinFn = async (args, _ctx) => {
  const vals = Object.values(args[0] ?? {});
  const n = vals.length;
  if (n < 4) return { "0-0": NaN };
  const mu = vals.reduce((a, b) => a + b, 0) / n;
  const m2 = vals.reduce((a, v) => a + (v - mu) ** 2, 0) / n;
  const m4 = vals.reduce((a, v) => a + (v - mu) ** 4, 0) / n;
  if (m2 === 0) return { "0-0": 0 };
  // Bias-corrected excess kurtosis (matches MATLAB kurtosis(x) - 3 with flag=0)
  const g2 = m4 / m2 ** 2 - 3;
  const corrected =
    ((n - 1) / ((n - 2) * (n - 3))) * ((n + 1) * g2 + 6);
  return { "0-0": corrected };
};
