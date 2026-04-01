import type { BuiltinFn, Matrix } from "../../types";

// Dot(mat1, mat2, dim)
// Dot product summed along a dimension.
//
//   args[0] = mat1 — first matrix/vector
//   args[1] = mat2 — second matrix/vector (must be same shape as mat1)
//   args[2] = dim  — 0 = sum across columns → column result vector (N×1)
//                    1 = sum across rows    → row result vector    (1×M)
//                    omitted → defaults to 0
//
// dim=0: for each row a, result["a-0"] = Σ_b mat1["a-b"] * mat2["a-b"]
// dim=1: for each col b, result["0-b"] = Σ_a mat1["a-b"] * mat2["a-b"]
export const dot: BuiltinFn = async (args, _ctx) => {
  const mat1 = args[0] ?? {};
  const mat2 = args[1] ?? {};
  const dim  = Math.round(args[2]?.["0-0"] ?? 0);

  // Determine matrix dimensions from keys
  let maxRow = 0, maxCol = 0;
  for (const key of Object.keys(mat1)) {
    const [r, c] = key.split("-").map(Number);
    if (r > maxRow) maxRow = r;
    if (c > maxCol) maxCol = c;
  }
  const rows = maxRow + 1;
  const cols = maxCol + 1;

  const result: Matrix = {};

  if (dim === 0) {
    // Sum across columns → one value per row
    for (let a = 0; a < rows; a++) {
      let sum = 0;
      for (let b = 0; b < cols; b++) {
        sum += (mat1[`${a}-${b}`] ?? 0) * (mat2[`${a}-${b}`] ?? 0);
      }
      result[`${a}-0`] = sum;
    }
  } else {
    // Sum across rows → one value per column
    for (let b = 0; b < cols; b++) {
      let sum = 0;
      for (let a = 0; a < rows; a++) {
        sum += (mat1[`${a}-${b}`] ?? 0) * (mat2[`${a}-${b}`] ?? 0);
      }
      result[`0-${b}`] = sum;
    }
  }

  return result;
};
