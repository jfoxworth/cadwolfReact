import type { BuiltinFn, Matrix } from "../../types";

// diff(v) — first-order finite differences: result[i] = v[i+1] - v[i]
// Returns a vector one element shorter than the input.
export const diff: BuiltinFn = async (args, _ctx) => {
  const mat = args[0] ?? {};
  const keys = Object.keys(mat);
  if (keys.length <= 1) return {};

  const sorted = [...keys].sort((a, b) => {
    const [ar, ac] = a.split("-").map(Number);
    const [br, bc] = b.split("-").map(Number);
    return ar !== br ? ar - br : ac - bc;
  });

  const isRowVec = sorted.every((k) => k.startsWith("0-"));
  const result: Matrix = {};

  for (let i = 0; i < sorted.length - 1; i++) {
    const outKey = isRowVec ? `0-${i}` : `${i}-0`;
    result[outKey] = mat[sorted[i + 1]] - mat[sorted[i]];
  }
  return result;
};
