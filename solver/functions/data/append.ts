import type { BuiltinFn, Matrix } from "../../types";

// Append(mat1, mat2, index)
// Concatenates two matrices along the given dimension (0-indexed).
//
//   args[0] = mat1  — first matrix
//   args[1] = mat2  — second matrix
//   args[2] = index — 0 = stack vertically (append rows)
//                     1 = stack horizontally (append columns)
//
// Example: Append([1,2,3], [4,5,6], 1) → [1,2,3,4,5,6]
//          Append([1,2,3], [4,5,6], 0) → [[1,2,3],[4,5,6]]
function matSize(mat: Matrix): [number, number] {
  let maxRow = 0, maxCol = 0;
  for (const key of Object.keys(mat)) {
    const [r, c] = key.split("-").map(Number);
    if (r > maxRow) maxRow = r;
    if (c > maxCol) maxCol = c;
  }
  return [maxRow + 1, maxCol + 1];
}

export const append: BuiltinFn = async (args, _ctx) => {
  const mat1  = args[0] ?? {};
  const mat2  = args[1] ?? {};
  const index = Math.round(args[2]?.["0-0"] ?? 0);

  const [rows1, cols1] = matSize(mat1);

  const result: Matrix = { ...mat1 };

  for (const key of Object.keys(mat2)) {
    const [r, c] = key.split("-").map(Number);
    if (index === 0) {
      // vertical stack — offset the row index
      result[`${r + rows1}-${c}`] = mat2[key] ?? 0;
    } else {
      // horizontal stack — offset the column index
      result[`${r}-${c + cols1}`] = mat2[key] ?? 0;
    }
  }

  return result;
};
