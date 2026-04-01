import type { BuiltinFn, Matrix } from "../../types";

// firstPos(arr, dim?)
// Finds the first index where the value crosses from ≤ 0 to > 0.
//
//   args[0] = arr — matrix to scan (row vector, column vector, or 2-D matrix)
//   args[1] = dim — optional scalar: 0 = scan columns per row (default for row/2D),
//                                    1 = scan rows per column (default for column/2D)
//
// For a row vector (1×N): returns 0-based column index of first positive crossing.
// For a column vector (N×1): returns 0-based row index of first positive crossing.
// For a 2-D matrix: returns a vector of crossing indices (one per row or per column).
// Returns 0 if no crossing is found.
export const firstPos: BuiltinFn = async (args, _ctx) => {
  const arr = args[0] ?? {};
  const dimArg = args[1]?.["0-0"] ?? -1; // -1 = auto

  const keys = Object.keys(arr);
  if (keys.length === 0) return { "0-0": 0 };

  // Infer size
  let numRows = 0, numCols = 0;
  for (const k of keys) {
    const [r, c] = k.split("-").map(Number);
    if (r >= numRows) numRows = r + 1;
    if (c >= numCols) numCols = c + 1;
  }

  const get = (r: number, c: number) => arr[`${r}-${c}`] ?? 0;
  const result: Matrix = {};
  let outIdx = 0;

  const scanCols = dimArg === 0 || (dimArg < 0 && numRows === 1) || (dimArg < 0 && numRows > 1 && numCols > 1);
  const scanRows = dimArg === 1 || (dimArg < 0 && numCols === 1) || (dimArg < 0 && numRows > 1 && numCols > 1);

  if (scanCols) {
    // Scan columns within each row — find first col where prev<=0 and cur>0
    for (let r = 0; r < numRows; r++) {
      let found = false;
      for (let c = 1; c < numCols; c++) {
        if (get(r, c - 1) <= 0 && get(r, c) > 0) {
          result[`0-${outIdx++}`] = c;
          found = true;
          if (numRows > 1 && numCols > 1) break; // 2-D: one crossing per row
        }
      }
      if (!found && numRows > 1 && numCols > 1) result[`0-${outIdx++}`] = 0;
    }
  }

  if (scanRows && !scanCols) {
    // Scan rows within each column — find first row where prev<=0 and cur>0
    for (let c = 0; c < numCols; c++) {
      let found = false;
      for (let r = 1; r < numRows; r++) {
        if (get(r - 1, c) <= 0 && get(r, c) > 0) {
          result[`0-${outIdx++}`] = r;
          found = true;
          break;
        }
      }
      if (!found && numRows > 1 && numCols > 1) result[`0-${outIdx++}`] = 0;
    }
  }

  if (outIdx === 0) return { "0-0": 0 };
  return result;
};
