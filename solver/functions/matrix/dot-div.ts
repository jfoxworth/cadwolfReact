import type { BuiltinFn, Matrix } from "../../types";

// DotDiv(mat1, mat2)
// Element-wise division of two same-shape matrices.
//
//   args[0] = mat1 — numerator matrix/vector
//   args[1] = mat2 — denominator matrix/vector (must be same shape as mat1)
//
// result[key] = mat1[key] / mat2[key]  for every key
export const dotDiv: BuiltinFn = async (args, _ctx) => {
  const mat1 = args[0] ?? {};
  const mat2 = args[1] ?? {};

  const result: Matrix = {};
  for (const key of Object.keys(mat1)) {
    result[key] = (mat1[key] ?? 0) / (mat2[key] ?? 1);
  }

  return result;
};
