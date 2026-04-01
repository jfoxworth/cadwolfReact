import type { BuiltinFn, Matrix } from "../../types";

// hypot(x, y) — element-wise sqrt(x^2 + y^2)
// If y is a scalar, it is broadcast across all elements of x.
// If both are scalars, returns a scalar.
export const hypot: BuiltinFn = async (args, _ctx) => {
  const x = args[0] ?? {};
  const y = args[1] ?? {};
  const result: Matrix = {};
  const keys = Object.keys(x);
  const yScalar = y["0-0"] ?? 0;
  const yIsScalar = Object.keys(y).length <= 1;
  for (const k of keys) {
    const yVal = yIsScalar ? yScalar : (y[k] ?? 0);
    result[k] = Math.hypot(x[k] ?? 0, yVal);
  }
  return result;
};
