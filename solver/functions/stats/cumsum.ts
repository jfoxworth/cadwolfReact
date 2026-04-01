import type { BuiltinFn, Matrix } from "../../types";

// cumsum(v) — cumulative sum of a vector, preserving key layout
export const cumsum: BuiltinFn = async (args, _ctx) => {
  const mat = args[0] ?? {};
  const keys = Object.keys(mat);
  if (keys.length === 0) return {};

  const sorted = [...keys].sort((a, b) => {
    const [ar, ac] = a.split("-").map(Number);
    const [br, bc] = b.split("-").map(Number);
    return ar !== br ? ar - br : ac - bc;
  });

  const result: Matrix = {};
  let acc = 0;
  for (const k of sorted) {
    acc += mat[k];
    result[k] = acc;
  }
  return result;
};
