import type { BuiltinFn } from "../../types";

// size(mat, dim)
// Returns the size of the matrix along the given dimension (1-indexed).
//
//   args[0] = mat — any matrix, vector, or scalar
//   args[1] = dim — scalar: 1 = number of rows, 2 = number of columns
//
// Returns 0 if dim is out of range.
export const size: BuiltinFn = async (args, _ctx) => {
  const mat = args[0] ?? {};
  const dim = Math.round(args[1]?.["0-0"] ?? 1);

  let maxRow = 0, maxCol = 0;
  for (const key of Object.keys(mat)) {
    const [r, c] = key.split("-").map(Number);
    if (r > maxRow) maxRow = r;
    if (c > maxCol) maxCol = c;
  }

  const rows = maxRow + 1;
  const cols = maxCol + 1;
  const result = dim === 1 ? rows : dim === 2 ? cols : 0;
  return { "0-0": result };
};
