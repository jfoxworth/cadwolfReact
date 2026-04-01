import type { BuiltinFn } from "../../types";

// NumEl(mat)
// Returns the total number of elements (rows × cols).
//
// Matches legacy: answer = product of all size dimensions.
export const numEl: BuiltinFn = async (args, _ctx) => {
  const mat = args[0] ?? {};
  return { "0-0": Object.keys(mat).length };
};
