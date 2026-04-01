import type { BuiltinFn, Matrix } from "../../types";

// rotate(mat)
// Rotates a matrix 90 degrees clockwise.
//
// The output is cols×rows (dimensions are swapped).
// Algorithm: iterate original columns in reverse order (right→left),
// each becomes a new row; within each new row the original rows become columns.
//
//   result[newRow][newCol] = input[newCol][cols - 1 - newRow]
//   where newRow = cols-1-col, newCol = row
export const rotate: BuiltinFn = async (args, _ctx) => {
  const mat = args[0] ?? {};

  let maxRow = 0, maxCol = 0;
  for (const key of Object.keys(mat)) {
    const [r, c] = key.split("-").map(Number);
    if (r > maxRow) maxRow = r;
    if (c > maxCol) maxCol = c;
  }
  const rows = maxRow + 1;
  const cols = maxCol + 1;

  const result: Matrix = {};
  let newRow = 0;
  for (let col = cols - 1; col >= 0; col--) {
    let newCol = 0;
    for (let row = 0; row < rows; row++) {
      result[`${newRow}-${newCol}`] = mat[`${row}-${col}`] ?? 0;
      newCol++;
    }
    newRow++;
  }

  return result;
};
