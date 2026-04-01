import type { BuiltinFn } from "../../types";

// RSNorm(mat)
// Row-sum norm (matrix ∞-norm on rows):
// max over all rows of the sum of absolute values in that row.
//
//   result = max_a ( Σ_b |mat[a-b]| )
export const rsNorm: BuiltinFn = async (args, _ctx) => {
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
  for (let a = 0; a < rows; a++) {
    let rowSum = 0;
    for (let b = 0; b < cols; b++) {
      rowSum += Math.abs(mat[`${a}-${b}`] ?? 0);
    }
    if (rowSum > maxSum) maxSum = rowSum;
  }

  return { "0-0": maxSum };
};
