import type { BuiltinFn } from "../../types";

// Norm(mat, p)
// Returns the p-norm of a matrix/vector: (Σ |xi|^p)^(1/p)
//
//   args[0] = mat — matrix or vector
//   args[1] = p   — norm order (integer, e.g. 1 = Manhattan, 2 = Euclidean)
export const norm: BuiltinFn = async (args, _ctx) => {
  const mat = args[0] ?? {};
  const p   = args[1]?.["0-0"] ?? 2;

  let sum = 0;
  for (const key of Object.keys(mat)) {
    sum += Math.pow(Math.abs(mat[key] ?? 0), p);
  }

  return { "0-0": Math.pow(sum, 1 / p) };
};
