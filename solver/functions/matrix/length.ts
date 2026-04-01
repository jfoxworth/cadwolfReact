import type { BuiltinFn } from "../../types";

// length(mat)
// Returns the size of the largest dimension (max of rows, cols).
//
// Matches legacy: answer = max of all size dimensions.
export const length: BuiltinFn = async (args, _ctx) => {
  const mat = args[0] ?? {};

  let maxRow = 0, maxCol = 0;
  for (const key of Object.keys(mat)) {
    const [r, c] = key.split("-").map(Number);
    if (r > maxRow) maxRow = r;
    if (c > maxCol) maxCol = c;
  }

  return { "0-0": Math.max(maxRow + 1, maxCol + 1) };
};
