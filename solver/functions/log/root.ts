import type { BuiltinFn, Matrix } from "../../types";

// root(n, value) — nth root of value, i.e. value^(1/n)
// Convention (matching original CadWolf): first arg is the root degree, second is the radicand.
// e.g. root(2, 4) = sqrt(4) = 2, root(3, 8) = cbrt(8) = 2
// Applied element-wise when value is a vector/matrix.
export const root: BuiltinFn = async (args, _ctx) => {
  const n   = args[0]?.["0-0"] ?? 2;
  const val = args[1];
  const result: Matrix = {};
  for (const key of Object.keys(val)) {
    result[key] = Math.pow(val[key] ?? 0, 1 / n);
  }
  return result;
};
