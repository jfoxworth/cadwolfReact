import type { BuiltinFn } from "../../types";

// Trace(mat)
// Returns the sum of the main diagonal elements.
//
//   result = Σ_a mat[a-a]
export const trace: BuiltinFn = async (args, _ctx) => {
  const mat = args[0] ?? {};

  let maxRow = 0;
  for (const key of Object.keys(mat)) {
    const r = Number(key.split("-")[0]);
    if (r > maxRow) maxRow = r;
  }

  let sum = 0;
  for (let a = 0; a <= maxRow; a++) {
    sum += mat[`${a}-${a}`] ?? 0;
  }

  return { "0-0": sum };
};
