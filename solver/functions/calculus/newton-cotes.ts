import type { BuiltinFn, Matrix } from "../../types";

function sortedVec(mat: Matrix): number[] {
  return Object.keys(mat)
    .sort((a, b) => {
      const [ar, ac] = a.split("-").map(Number);
      const [br, bc] = b.split("-").map(Number);
      return ar !== br ? ar - br : ac - bc;
    })
    .map((k) => mat[k] ?? 0);
}

// newton-cotes(x, y, order) — Newton-Cotes integration
// order 1 = Trapezoid, 2 = Simpson's 1/3, 3 = Simpson's 3/8, 4 = Boole's rule
// x and y must be the same length. Minimum 5 points required.
// Orders 2/3/4 require (n-1) to be divisible by the order.
export const newtonCotes: BuiltinFn = async (args, _ctx) => {
  const x = sortedVec(args[0] ?? {});
  const y = sortedVec(args[1] ?? {});
  const order = Math.round(args[2]?.["0-0"] ?? 1);
  const n = x.length;

  if (n !== y.length) throw new Error("newton-cotes: x and y must be the same length");
  if (n < 5) throw new Error("newton-cotes: minimum 5 points required");
  if (order === 2 && (n - 1) % 2 !== 0) throw new Error("newton-cotes: order 2 requires an even number of intervals");
  if (order === 3 && (n - 1) % 3 !== 0) throw new Error("newton-cotes: order 3 requires (n-1) divisible by 3");
  if (order === 4 && (n - 1) % 4 !== 0) throw new Error("newton-cotes: order 4 requires (n-1) divisible by 4");

  let I = 0;

  if (order === 1) {
    // Trapezoid
    for (let i = 0; i < n - 1; i++) {
      I += 0.5 * (x[i + 1] - x[i]) * (y[i] + y[i + 1]);
    }
  } else if (order === 2) {
    // Simpson's 1/3
    for (let i = 0; i < n - 2; i += 2) {
      I += (1 / 6) * (x[i + 2] - x[i]) * (y[i] + 4 * y[i + 1] + y[i + 2]);
    }
  } else if (order === 3) {
    // Simpson's 3/8
    for (let i = 0; i < n - 3; i += 3) {
      I += (1 / 8) * (x[i + 3] - x[i]) * (y[i] + 3 * y[i + 1] + 3 * y[i + 2] + y[i + 3]);
    }
  } else if (order === 4) {
    // Boole's rule
    for (let i = 0; i <= n - 5; i += 4) {
      I += (1 / 90) * (x[i + 4] - x[i]) * (7 * y[i] + 32 * y[i + 1] + 12 * y[i + 2] + 32 * y[i + 3] + 7 * y[i + 4]);
    }
  } else {
    throw new Error("newton-cotes: order must be 1, 2, 3, or 4");
  }

  return { "0-0": I };
};
