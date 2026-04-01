import type { BuiltinFn, Matrix } from "../../types";

// DerivativeUn(xdata, ydata, newxdata)
// First derivative of unequally-spaced data using 3-point Lagrange quadratic differentiation.
//
//   args[0] = xdata    — row vector of x positions (original sample locations)
//   args[1] = ydata    — row vector of y values at each xdata point
//   args[2] = newxdata — row vector of x locations where the derivative is desired
//
// For each query point in newxdata the algorithm finds the nearest sample
// point x[i] in xdata (i ∈ [1, n-2]) and evaluates the derivative of the
// quadratic polynomial through (x[i-1], y[i-1]), (x[i], y[i]), (x[i+1], y[i+1]).
//
// Derivative formula (Lagrange quadratic):
//   dy/dx = f0*(2x−x1−x2)/((x0−x1)(x0−x2))
//         + f1*(2x−x0−x2)/((x1−x0)(x1−x2))
//         + f2*(2x−x0−x1)/((x2−x0)(x2−x1))
//
// At least 5 points in xdata/ydata required (matches legacy DerivativeUn5 error).
// If a query point cannot be matched to an interior bracket the output at that
// index is 0 (matches legacy "DerivativeUn3 error" behaviour in the new pipeline).
export const derivativeUn: BuiltinFn = async (args, _ctx) => {
  const xlocs  = args[0] ?? {};
  const f_x    = args[1] ?? {};
  const newx   = args[2] ?? {};

  const n    = Object.keys(xlocs).length;
  const nNew = Object.keys(newx).length;

  if (n < 5) return { "0-0": 0 };

  const xAt  = (i: number) => xlocs[`0-${i}`] ?? 0;
  const yAt  = (i: number) => f_x[`0-${i}`]  ?? 0;
  const qAt  = (i: number) => newx[`0-${i}`]  ?? 0;

  const result: Matrix = {};
  let i = 1; // current bracket index, advances monotonically

  for (let newi = 0; newi < nNew; newi++) {
    const qx = qAt(newi);
    let found = false;

    // Advance i until xlocs[i] is nearest among xlocs[i-1], xlocs[i], xlocs[i+1]
    while (!found && i < n - 1) {
      const d0 = Math.abs(qx - xAt(i - 1));
      const d1 = Math.abs(qx - xAt(i));
      const d2 = Math.abs(qx - xAt(i + 1));

      const nearest =
        (d1 < d0 && d1 < d2) ||
        (d1 < d0 && d1 === d2) ||
        (d1 === d0 && d1 < d2) ||
        (d1 < d2 && i === 1) ||
        (d1 < d0 && i === n - 2);

      if (nearest) {
        found = true;
        // Quadratic Lagrange derivative
        const x0 = xAt(i - 1), x1 = xAt(i), x2 = xAt(i + 1);
        const f0 = yAt(i - 1), f1 = yAt(i), f2 = yAt(i + 1);
        result[`0-${newi}`] =
          f0 * ((2 * qx - x1 - x2) / ((x0 - x1) * (x0 - x2))) +
          f1 * ((2 * qx - x0 - x2) / ((x1 - x0) * (x1 - x2))) +
          f2 * ((2 * qx - x0 - x1) / ((x2 - x0) * (x2 - x1)));
      } else {
        i++;
      }
    }

    if (!found) {
      result[`0-${newi}`] = 0; // query point out of range
    }
  }

  if (Object.keys(result).length === 0) return { "0-0": 0 };
  return result;
};
