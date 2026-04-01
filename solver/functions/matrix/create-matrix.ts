import type { BuiltinFn, Matrix } from "../../types";

// CreateMatrix(realDefault, imagDefault, dim1, dim2, ...)
// Creates a matrix of given dimensions filled with a default value.
//
//   args[0] = realDefault — value to fill every element with
//   args[1] = imagDefault — imaginary default (ignored; pipeline is real-only)
//   args[2] = dim1        — size of first dimension (rows for 2D)
//   args[3] = dim2        — size of second dimension (cols for 2D)
//   args[4+]              — additional dimensions (rare; treated as extra cols)
//
// For the standard 2D case CreateMatrix(val, 0, rows, cols) produces an
// rows×cols matrix where every element equals val.
// The original code had an off-by-one that skipped key "0-0"; this
// implementation generates all keys correctly from (0,0) to (rows-1, cols-1).
export const createMatrix: BuiltinFn = async (args, _ctx) => {
  const fill = args[0]?.["0-0"] ?? 0;
  const rows = Math.round(args[2]?.["0-0"] ?? 1);
  const cols = Math.round(args[3]?.["0-0"] ?? 1);

  const result: Matrix = {};
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      result[`${r}-${c}`] = fill;
    }
  }

  return result;
};
