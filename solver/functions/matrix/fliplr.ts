import type { BuiltinFn, Matrix } from "../../types";

// fliplr(mat)
// Flips a matrix left-to-right (reverses column order).
//
// result["row-col"] = mat["row-(cols-1-col)"]
export const fliplr: BuiltinFn = async (args, _ctx) => {
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
      result[`${a}-${b}`] = mat[`${a}-${cols - 1 - b}`] ?? 0;
    }
  }

  return result;
};
