import type { BuiltinFn, Matrix } from "../../types";

// logfit(x, y)  →  y = A + B*ln(x)
// Linear regression where the predictor is ln(x).
// Returns a 2×1 column vector: row 0 = A, row 1 = B.

function matToArray(m: Matrix): number[] {
  return Object.keys(m)
    .sort((a, b) => {
      const [ar, ac] = a.split("-").map(Number);
      const [br, bc] = b.split("-").map(Number);
      return ar !== br ? ar - br : ac - bc;
    })
    .map((k) => m[k]);
}

export const logfit: BuiltinFn = async (args, _ctx) => {
  const xs = matToArray(args[0] ?? {});
  const ys = matToArray(args[1] ?? {});
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return { "0-0": 0, "1-0": 0 };

  let sumLnX = 0, sumY = 0, sumLnX2 = 0, sumLnXY = 0;
  let count = 0;
  for (let i = 0; i < n; i++) {
    if (xs[i] <= 0) continue;
    const lx = Math.log(xs[i]);
    sumLnX  += lx;
    sumY    += ys[i];
    sumLnX2 += lx * lx;
    sumLnXY += lx * ys[i];
    count++;
  }
  if (count < 2) return { "0-0": 0, "1-0": 0 };

  const denom = count * sumLnX2 - sumLnX * sumLnX;
  if (denom === 0) return { "0-0": 0, "1-0": 0 };

  const B = (count * sumLnXY - sumLnX * sumY) / denom;
  const A = (sumY - B * sumLnX) / count;

  return { "0-0": A, "1-0": B };
};
