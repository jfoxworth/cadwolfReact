import type { BuiltinFn, Matrix } from "../../types";

// flatten(A) — collapse a matrix to a row vector, scanning row by row
export const flatten: BuiltinFn = async (args, _ctx) => {
  const A = args[0] ?? {};
  const sorted = Object.keys(A).sort((a, b) => {
    const [ar, ac] = a.split("-").map(Number);
    const [br, bc] = b.split("-").map(Number);
    return ar !== br ? ar - br : ac - bc;
  });
  if (sorted.length === 0) return {};
  const result: Matrix = {};
  sorted.forEach((k, i) => { result[`0-${i}`] = A[k] ?? 0; });
  return result;
};
