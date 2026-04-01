import type { BuiltinFn, Matrix } from "../../types";

// matur(A, k?) — upper-right portion of a square matrix
// Default k = 0: keeps elements strictly above the main diagonal (col > row).
// A positive k offsets further from the diagonal; negative k includes diagonal bands.
export const matur: BuiltinFn = async (args, _ctx) => {
  const A = args[0] ?? {};
  const k = Math.round(args[1]?.["0-0"] ?? 0);
  const result: Matrix = {};
  for (const key of Object.keys(A)) {
    const [r, c] = key.split("-").map(Number);
    if (c - r > k) result[key] = A[key] ?? 0;
    else result[key] = 0;
  }
  return result;
};
