import type { BuiltinFn } from "../../types";

// corr(x, y) — Pearson correlation coefficient between two vectors
export const corr: BuiltinFn = async (args, _ctx) => {
  const xVals = Object.values(args[0] ?? {});
  const yVals = Object.values(args[1] ?? {});
  const n = Math.min(xVals.length, yVals.length);
  if (n < 2) return { "0-0": NaN };

  const mx = xVals.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const my = yVals.slice(0, n).reduce((a, b) => a + b, 0) / n;

  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xVals[i] - mx;
    const dy = yVals[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  return { "0-0": denom === 0 ? 0 : num / denom };
};
