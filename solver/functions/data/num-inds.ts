import type { BuiltinFn } from "../../types";

// numinds(value)
// Returns the number of index dimensions of the input.
//
//   args[0] = any scalar, vector, or matrix
//
// Returns 1 if the input is a scalar (1×1), 2 for any vector or matrix.
// Matches legacy behaviour: Format_size=="1x1" → 1, otherwise ilength (always 2 for 2D data).
export const numInds: BuiltinFn = async (args, _ctx) => {
  const mat = args[0] ?? {};
  const keys = Object.keys(mat);

  // Scalar: single key "0-0"
  const isScalar = keys.length === 1 && keys[0] === "0-0";

  return { "0-0": isScalar ? 1 : 2 };
};
