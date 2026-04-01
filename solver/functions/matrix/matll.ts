import type { BuiltinFn, Matrix } from "../../types";

// matll(A, k?) — lower-left portion of a square matrix
// Default k = 0: keeps elements strictly below the main diagonal (row > col).
// A positive k offsets further from the diagonal; negative k includes diagonal bands.
export const matll: BuiltinFn = async (args, _ctx) => {
  const A = args[0] ?? {};
  const k = Math.round(args[1]?.["0-0"] ?? 0);
  const result: Matrix = {};
  for (const key of Object.keys(A)) {
    const [r, c] = key.split("-").map(Number);
    if (r - c > k) result[key] = A[key] ?? 0;
    else result[key] = 0;
  }
  return result;
};
