import type { BuiltinFn, Matrix } from "../../types";

// row2mat(rowVec, numRows)
// Broadcasts a row vector into a matrix by repeating it as identical rows.
//
//   args[0] = rowVec  — row vector (1×M), keys "0-0","0-1",...,"0-M-1"
//   args[1] = numRows — scalar: how many rows to produce
//
// Output is a numRows×M matrix where every row equals rowVec.
export const row2mat: BuiltinFn = async (args, _ctx) => {
  const rowVec  = args[0] ?? {};
  const numRows = Math.round(args[1]?.["0-0"] ?? 1);

  // Count cols from the keys (all keys are "0-col")
  const numCols = Object.keys(rowVec).length;
  if (numCols === 0) return { "0-0": 0 };

  const result: Matrix = {};
  for (let col = 0; col < numCols; col++) {
    const val = rowVec[`0-${col}`] ?? 0;
    for (let row = 0; row < numRows; row++) {
      result[`${row}-${col}`] = val;
    }
  }

  return result;
};
