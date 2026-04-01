import type { BuiltinFn } from "../../types";

// cov(x, y?) — sample covariance between x and y (or variance of x if one arg)
export const cov: BuiltinFn = async (args, _ctx) => {
  const xVals = Object.values(args[0] ?? {});
  const yVals = args[1] !== undefined ? Object.values(args[1]) : xVals;
  const n = Math.min(xVals.length, yVals.length);
  if (n < 2) return { "0-0": NaN };

  const mx = xVals.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const my = yVals.slice(0, n).reduce((a, b) => a + b, 0) / n;

  let sum = 0;
  for (let i = 0; i < n; i++) sum += (xVals[i] - mx) * (yVals[i] - my);
  return { "0-0": sum / (n - 1) };
};
