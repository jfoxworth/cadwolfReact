import type { BuiltinFn } from "../../types";

// isRow(mat)
// Returns 1 if the input is a row vector (rows == 1, cols > 1), else 0.
//
// Matches legacy: (sizes[0] == 1) && (sizes[1] > 1)
// Scalars (1×1) and column vectors (N×1) return 0.
export const isRow: BuiltinFn = async (args, _ctx) => {
  const mat = args[0] ?? {};
  const keys = Object.keys(mat);

  let maxRow = 0, maxCol = 0;
  for (const key of keys) {
    const [r, c] = key.split("-").map(Number);
    if (r > maxRow) maxRow = r;
    if (c > maxCol) maxCol = c;
  }

  return { "0-0": maxRow === 0 && maxCol > 0 ? 1 : 0 };
};
