import type { BuiltinFn } from "../../types";

// Integrate(xdata, ydata)
// Trapezoidal integration of unequally-spaced (x, y) data.
//
//   args[0] = xdata  — row vector of x positions (need not be equally spaced)
//   args[1] = ydata  — row vector of y values (same length as xdata)
//
// Returns a scalar: the total integral from x[0] to x[n-1].
// At least 5 points required (matches legacy Integrate4 error).
export const integrate: BuiltinFn = async (args, _ctx) => {
  const xdata = args[0] ?? {};
  const ydata = args[1] ?? {};

  const n = Object.keys(xdata).length;
  if (n < 5) return { "0-0": 0 };

  const x = (i: number) => xdata[`0-${i}`] ?? 0;
  const y = (i: number) => ydata[`0-${i}`] ?? 0;

  let integral = 0;
  for (let i = 0; i < n - 1; i++) {
    integral += 0.5 * (x(i + 1) - x(i)) * (y(i) + y(i + 1));
  }

  return { "0-0": integral };
};
