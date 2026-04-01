import type { BuiltinFn, Matrix } from "../../types";

// Conj(mat)
// Returns the complex conjugate of a matrix.
//
// The pipeline works with real numbers only, so this is a pass-through
// that copies every element unchanged — matching the legacy behaviour
// where only the imaginary part is negated (which is always 0 here).
export const conj: BuiltinFn = async (args, _ctx) => {
  const mat = args[0] ?? {};
  const result: Matrix = {};

  for (const key of Object.keys(mat)) {
    result[key] = mat[key] ?? 0;
  }

  return result;
};
