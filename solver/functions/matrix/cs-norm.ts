import type { BuiltinFn } from "../../types";

// CSNorm(mat)
// Column-sum norm (matrix ∞-norm on columns):
// max over all columns of the sum of absolute values in that column.
//
//   result = max_b ( Σ_a |mat[a-b]| )
export const csNorm: BuiltinFn = async (args, _ctx) => {
  const mat = args[0] ?? {};

  let maxRow = 0, maxCol = 0;
  for (const key of Object.keys(mat)) {
    const [r, c] = key.split("-").map(Number);
    if (r > maxRow) maxRow = r;
    if (c > maxCol) maxCol = c;
  }
  const rows = maxRow + 1;
  const cols = maxCol + 1;

  let maxSum = 0;
  for (let b = 0; b < cols; b++) {
    let colSum = 0;
    for (let a = 0; a < rows; a++) {
      colSum += Math.abs(mat[`${a}-${b}`] ?? 0);
    }
    if (colSum > maxSum) maxSum = colSum;
  }

  return { "0-0": maxSum };
};
