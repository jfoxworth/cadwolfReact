import type { BuiltinFn, Matrix } from "../../types";

// polyfit(order, x, y)  →  y = a0 + a1*x + a2*x^2 + ... + an*x^n
// Builds normal equations via Vandermonde moment sums, solves via Gaussian elimination.
// Returns an (order+1)×1 column vector of coefficients [a0, a1, ..., an].

function matToArray(m: Matrix): number[] {
  return Object.keys(m)
    .sort((a, b) => {
      const [ar, ac] = a.split("-").map(Number);
      const [br, bc] = b.split("-").map(Number);
      return ar !== br ? ar - br : ac - bc;
    })
    .map((k) => m[k]);
}

export const polyfit: BuiltinFn = async (args, _ctx) => {
  const order = Math.round(args[0]?.["0-0"] ?? 1);
  const xs = matToArray(args[1] ?? {});
  const ys = matToArray(args[2] ?? {});
  const n = Math.min(xs.length, ys.length);
  const m = order + 1; // number of coefficients

  if (n < m) {
    const result: Matrix = {};
    for (let i = 0; i < m; i++) result[`${i}-0`] = 0;
    return result;
  }

  // xsum[k] = sum(x_i^k) for k = 0 to 2*order
  // ysum[k] = sum(y_i * x_i^k) for k = 0 to order
  const xsum: number[] = new Array(2 * order + 1).fill(0);
  const ysum: number[] = new Array(m).fill(0);

  for (let i = 0; i < n; i++) {
    let xpow = 1;
    for (let k = 0; k <= 2 * order; k++) {
      xsum[k] += xpow;
      if (k <= order) ysum[k] += ys[i] * xpow;
      xpow *= xs[i];
    }
  }

  // Build augmented matrix [A | b] where A[i][j] = xsum[i+j], b[i] = ysum[i]
  const aug: number[][] = [];
  for (let i = 0; i < m; i++) {
    const row: number[] = [];
    for (let j = 0; j < m; j++) row.push(xsum[i + j]);
    row.push(ysum[i]);
    aug.push(row);
  }

  // Gaussian elimination with partial pivoting
  for (let col = 0; col < m; col++) {
    // Find pivot
    let maxRow = col;
    for (let row = col + 1; row < m; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

    const pivot = aug[col][col];
    if (Math.abs(pivot) < 1e-15) continue;

    for (let row = 0; row < m; row++) {
      if (row === col) continue;
      const factor = aug[row][col] / pivot;
      for (let k = col; k <= m; k++) {
        aug[row][k] -= factor * aug[col][k];
      }
    }
  }

  // Extract solution
  const result: Matrix = {};
  for (let i = 0; i < m; i++) {
    const coef = aug[i][i] !== 0 ? aug[i][m] / aug[i][i] : 0;
    result[`${i}-0`] = coef;
  }
  return result;
};
