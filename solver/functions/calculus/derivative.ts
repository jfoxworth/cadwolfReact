import type { BuiltinFn, Matrix } from "../../types";

// Derivative(ydata, xspacing, order, accuracy)
// Centered finite-difference derivative of a uniformly-spaced vector.
//
//   args[0] = ydata    — row vector of function values
//   args[1] = xspacing — scalar uniform step size h
//   args[2] = order    — derivative order: 1, 2, 3, or 4
//   args[3] = accuracy — stencil accuracy: 1 = O(h²),  2 = O(h⁴)
//
// Output is a shorter row vector (boundary points are dropped to fit the stencil).
// Stencil coefficients from Chapra & Canale "Numerical Methods for Engineers".
//
// Note: the original eqSolverOld.js used `xspace^4` (JavaScript XOR, a bug) for
// the 4th-order denominator and had sign errors in the O(h⁴) 4th-derivative stencil.
// Correct mathematical formulas are used here.
export const derivative: BuiltinFn = async (args, _ctx) => {
  const f        = args[0] ?? {};
  const h        = args[1]?.["0-0"] ?? 1;
  const order    = Math.round(args[2]?.["0-0"] ?? 1);
  const accuracy = Math.round(args[3]?.["0-0"] ?? 1);

  const n = Object.keys(f).length;
  if (n < 5) return { "0-0": 0 }; // need at least 5 points (matches legacy Derivative5 error)

  const fi = (i: number) => f[`0-${i}`] ?? 0;
  const result: Matrix = {};
  let out = 0; // output index counter

  if (order === 1) {
    if (accuracy === 1) {
      // O(h²): (f[i+1] - f[i-1]) / (2h)
      for (let i = 1; i <= n - 2; i++) {
        result[`0-${out++}`] = (fi(i + 1) - fi(i - 1)) / (2 * h);
      }
    } else {
      // O(h⁴): (-f[i+2] + 8f[i+1] - 8f[i-1] + f[i-2]) / (12h)
      for (let i = 2; i <= n - 3; i++) {
        result[`0-${out++}`] = (-fi(i + 2) + 8 * fi(i + 1) - 8 * fi(i - 1) + fi(i - 2)) / (12 * h);
      }
    }
  } else if (order === 2) {
    if (accuracy === 1) {
      // O(h²): (f[i+1] - 2f[i] + f[i-1]) / h²
      for (let i = 1; i <= n - 2; i++) {
        result[`0-${out++}`] = (fi(i + 1) - 2 * fi(i) + fi(i - 1)) / (h * h);
      }
    } else {
      // O(h⁴): (-f[i+2] + 16f[i+1] - 30f[i] + 16f[i-1] - f[i-2]) / (12h²)
      for (let i = 2; i <= n - 3; i++) {
        result[`0-${out++}`] = (-fi(i + 2) + 16 * fi(i + 1) - 30 * fi(i) + 16 * fi(i - 1) - fi(i - 2)) / (12 * h * h);
      }
    }
  } else if (order === 3) {
    if (accuracy === 1) {
      // O(h²): (f[i+2] - 2f[i+1] + 2f[i-1] - f[i-2]) / (2h³)
      for (let i = 2; i <= n - 3; i++) {
        result[`0-${out++}`] = (fi(i + 2) - 2 * fi(i + 1) + 2 * fi(i - 1) - fi(i - 2)) / (2 * h * h * h);
      }
    } else {
      // O(h⁴): (-f[i+3] + 8f[i+2] - 13f[i+1] + 13f[i-1] - 8f[i-2] + f[i-3]) / (8h³)
      for (let i = 3; i <= n - 4; i++) {
        result[`0-${out++}`] = (-fi(i + 3) + 8 * fi(i + 2) - 13 * fi(i + 1) + 13 * fi(i - 1) - 8 * fi(i - 2) + fi(i - 3)) / (8 * h * h * h);
      }
    }
  } else if (order === 4) {
    if (accuracy === 1) {
      // O(h²): (f[i+2] - 4f[i+1] + 6f[i] - 4f[i-1] + f[i-2]) / h⁴
      for (let i = 2; i <= n - 3; i++) {
        result[`0-${out++}`] = (fi(i + 2) - 4 * fi(i + 1) + 6 * fi(i) - 4 * fi(i - 1) + fi(i - 2)) / Math.pow(h, 4);
      }
    } else {
      // O(h⁴): (-f[i+3] + 12f[i+2] - 39f[i+1] + 56f[i] - 39f[i-1] + 12f[i-2] - f[i-3]) / (6h⁴)
      for (let i = 3; i <= n - 4; i++) {
        result[`0-${out++}`] = (-fi(i + 3) + 12 * fi(i + 2) - 39 * fi(i + 1) + 56 * fi(i) - 39 * fi(i - 1) + 12 * fi(i - 2) - fi(i - 3)) / (6 * Math.pow(h, 4));
      }
    }
  }

  if (out === 0) return { "0-0": 0 };
  return result;
};
