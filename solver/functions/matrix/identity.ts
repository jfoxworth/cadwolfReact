import type { BuiltinFn, Matrix } from "../../types";

// Identity(n)
// Returns an n×n identity matrix (1 on main diagonal, 0 elsewhere).
//
//   args[0] = n — size (scalar)
export const identity: BuiltinFn = async (args, _ctx) => {
  const n = Math.round(args[0]?.["0-0"] ?? 1);
  const result: Matrix = {};

  for (let a = 0; a < n; a++) {
    for (let b = 0; b < n; b++) {
      result[`${a}-${b}`] = a === b ? 1 : 0;
    }
  }

  return result;
};
