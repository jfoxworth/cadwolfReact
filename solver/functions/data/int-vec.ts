import type { BuiltinFn, Matrix } from "../../types";

// IntVec(xdata, ydata)
// Cumulative trapezoidal integration — returns a vector (like MATLAB cumtrapz).
//
//   args[0] = xdata — row vector of x positions (unequally spaced ok)
//   args[1] = ydata — row vector of y values (same length as xdata)
//
// Output has n-1 elements where output[i] = ∫ y dx from x[0] to x[i+1].
// Requires at least 3 points (matches legacy IntVec3 error).
export const intVec: BuiltinFn = async (args, _ctx) => {
  const xdata = args[0] ?? {};
  const ydata = args[1] ?? {};

  const n = Object.keys(ydata).length;
  if (n < 3) return { "0-0": 0 };

  const x = (i: number) => xdata[`0-${i}`] ?? 0;
  const y = (i: number) => ydata[`0-${i}`] ?? 0;

  // Build cumulative sum in a temp array (indices 0..n-1)
  const cum: number[] = new Array(n).fill(0);
  for (let a = 1; a < n; a++) {
    const avg = (y(a - 1) + y(a)) / 2;
    const dx  = x(a) - x(a - 1);
    cum[a] = cum[a - 1] + avg * dx;
  }

  // Shift left: output[0] = cum[1], ..., output[n-2] = cum[n-1]
  const result: Matrix = {};
  for (let a = 0; a < n - 1; a++) {
    result[`0-${a}`] = cum[a + 1];
  }

  return result;
};
