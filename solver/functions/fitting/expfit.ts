import type { BuiltinFn, Matrix } from "../../types";

// expfit(x, y)  →  y = e^A * e^(B*x)  i.e. y = C * e^(B*x)
// Weighted least squares on ln(y): weights wi = yi^2.
// Returns a 2×1 column vector: row 0 = C (= e^A), row 1 = B.

function matToArray(m: Matrix): number[] {
  return Object.keys(m)
    .sort((a, b) => {
      const [ar, ac] = a.split("-").map(Number);
      const [br, bc] = b.split("-").map(Number);
      return ar !== br ? ar - br : ac - bc;
    })
    .map((k) => m[k]);
}

export const expfit: BuiltinFn = async (args, _ctx) => {
  const xs = matToArray(args[0] ?? {});
  const ys = matToArray(args[1] ?? {});
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return { "0-0": 0, "1-0": 0 };

  let W = 0, Wx = 0, Wxx = 0, Wy = 0, Wxy = 0;
  let count = 0;
  for (let i = 0; i < n; i++) {
    if (ys[i] <= 0) continue;
    const wi  = ys[i] * ys[i];
    const lny = Math.log(ys[i]);
    W   += wi;
    Wx  += wi * xs[i];
    Wxx += wi * xs[i] * xs[i];
    Wy  += wi * lny;
    Wxy += wi * xs[i] * lny;
    count++;
  }
  if (count < 2) return { "0-0": 0, "1-0": 0 };

  const det = W * Wxx - Wx * Wx;
  if (det === 0) return { "0-0": 0, "1-0": 0 };

  const A = (Wxx * Wy - Wx * Wxy) / det;
  const B = (W * Wxy - Wx * Wy) / det;

  return { "0-0": Math.exp(A), "1-0": B };
};
