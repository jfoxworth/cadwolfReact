import type { BuiltinFn, Matrix } from "../../types";

// Col2Mat(colVec, numCols)
// Broadcasts a column vector into a matrix by repeating it as identical columns.
//
//   args[0] = colVec  — column vector (N×1), keys "0-0","1-0",...,"N-1-0"
//   args[1] = numCols — scalar: how many columns to produce
//
// Output is an N×numCols matrix where every column equals colVec.
// Requires args[0] to be a single-column vector (col index must always be 0).
export const col2mat: BuiltinFn = async (args, _ctx) => {
  const colVec  = args[0] ?? {};
  const numCols = Math.round(args[1]?.["0-0"] ?? 1);

  // Count rows from the keys (all keys are "row-0")
  const numRows = Object.keys(colVec).length;
  if (numRows === 0) return { "0-0": 0 };

  const result: Matrix = {};
  for (let row = 0; row < numRows; row++) {
    const val = colVec[`${row}-0`] ?? 0;
    for (let col = 0; col < numCols; col++) {
      result[`${row}-${col}`] = val;
    }
  }

  return result;
};
