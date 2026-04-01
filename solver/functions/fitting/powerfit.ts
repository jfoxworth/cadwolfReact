import type { BuiltinFn, Matrix } from "../../types";

// powerfit(x, y)  →  y = A * x^B
// Log-linearizes: ln(y) = ln(A) + B*ln(x), then solves via simple linear regression.
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

export const powerfit: BuiltinFn = async (args, _ctx) => {
  const xs = matToArray(args[0] ?? {});
  const ys = matToArray(args[1] ?? {});
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return { "0-0": 0, "1-0": 0 };

  let sumLnX = 0, sumLnY = 0, sumLnX2 = 0, sumLnXLnY = 0;
  let count = 0;
  for (let i = 0; i < n; i++) {
    if (xs[i] <= 0 || ys[i] <= 0) continue;
    const lx = Math.log(xs[i]);
    const ly = Math.log(ys[i]);
    sumLnX    += lx;
    sumLnY    += ly;
    sumLnX2   += lx * lx;
    sumLnXLnY += lx * ly;
    count++;
  }
  if (count < 2) return { "0-0": 0, "1-0": 0 };

  const denom = count * sumLnX2 - sumLnX * sumLnX;
  if (denom === 0) return { "0-0": 0, "1-0": 0 };

  const B = (count * sumLnXLnY - sumLnX * sumLnY) / denom;
  const A = Math.exp((sumLnY - B * sumLnX) / count);

  return { "0-0": A, "1-0": B };
};
