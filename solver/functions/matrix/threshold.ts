import type { BuiltinFn, Matrix } from "../../types";

// Threshold(mat, low, high)
// Clamps every element of a matrix to [low, high].
//
//   args[0] = mat  — input matrix/vector
//   args[1] = low  — minimum clamp value (use null/undefined to skip)
//   args[2] = high — maximum clamp value (use null/undefined to skip)
//
// A bound is disabled if its arg is absent or its Matrix is empty.
// Values above high are set to high; values below low are set to low.
export const threshold: BuiltinFn = async (args, _ctx) => {
  const mat  = args[0] ?? {};
  const low  = args[1] != null && Object.keys(args[1]).length > 0 ? (args[1]["0-0"] ?? null) : null;
  const high = args[2] != null && Object.keys(args[2]).length > 0 ? (args[2]["0-0"] ?? null) : null;

  const result: Matrix = {};
  for (const key of Object.keys(mat)) {
    let val = mat[key] ?? 0;
    if (high !== null && val > high) val = high;
    if (low  !== null && val < low)  val = low;
    result[key] = val;
  }

  return result;
};
