import type { BuiltinFn, Matrix } from "../../types";

// Transpose(mat)
// Returns the matrix transpose — swaps row and column indices.
//
//   args[0] = mat — any matrix or vector
//
// An N×M input becomes M×N output: result["col-row"] = mat["row-col"].
export const transpose: BuiltinFn = async (args, _ctx) => {
  const mat = args[0] ?? {};
  const result: Matrix = {};

  for (const key of Object.keys(mat)) {
    const [row, col] = key.split("-");
    result[`${col}-${row}`] = mat[key] ?? 0;
  }

  return result;
};
