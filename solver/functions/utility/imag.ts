import type { BuiltinFn, Matrix } from "../../types";

// Imag(mat)
// Returns the imaginary part of a matrix. The pipeline operates on real
// numbers only, so the imaginary part is always zero for every element.
export const imag: BuiltinFn = async (args, _ctx) => {
  const mat = args[0] ?? {};
  const result: Matrix = {};
  for (const key of Object.keys(mat)) {
    result[key] = 0;
  }
  return result;
};
