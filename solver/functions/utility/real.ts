import type { BuiltinFn, Matrix } from "../../types";

// Real(mat)
// Returns the real part of a matrix. The pipeline operates on real numbers
// only, so this is a pass-through that copies every element unchanged.
export const real: BuiltinFn = async (args, _ctx) => {
  const mat = args[0] ?? {};
  const result: Matrix = {};
  for (const key of Object.keys(mat)) {
    result[key] = mat[key] ?? 0;
  }
  return result;
};
