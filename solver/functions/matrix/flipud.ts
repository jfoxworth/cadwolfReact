import type { BuiltinFn, Matrix } from "../../types";

// flipud(mat)
// Flips a matrix up-to-down (reverses row order).
//
// result["row-col"] = mat["(rows-1-row)-col"]
export const flipud: BuiltinFn = async (args, _ctx) => {
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
  for (let a = 0; a < rows; a++) {
    for (let b = 0; b < cols; b++) {
      result[`${a}-${b}`] = mat[`${rows - 1 - a}-${b}`] ?? 0;
    }
  }

  return result;
};
