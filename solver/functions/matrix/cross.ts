import type { BuiltinFn, Matrix } from "../../types";

// Cross(mat1, mat2)
// 3D cross product of two 1×3 row vectors.
//
//   args[0] = mat1 — 1×3 row vector [a0, a1, a2]
//   args[1] = mat2 — 1×3 row vector [b0, b1, b2]
//
// result = [ a1*b2 - a2*b1,  -(a0*b2 - a2*b0),  a0*b1 - a1*b0 ]
export const cross: BuiltinFn = async (args, _ctx) => {
  const a = args[0] ?? {};
  const b = args[1] ?? {};

  const a0 = a["0-0"] ?? 0, a1 = a["0-1"] ?? 0, a2 = a["0-2"] ?? 0;
  const b0 = b["0-0"] ?? 0, b1 = b["0-1"] ?? 0, b2 = b["0-2"] ?? 0;

  const result: Matrix = {
    "0-0":  a1 * b2 - a2 * b1,
    "0-1": -(a0 * b2 - a2 * b0),
    "0-2":  a0 * b1 - a1 * b0,
  };

  return result;
};
