import type { BuiltinFn, Matrix } from "../../types";

// unique(v) — sorted unique elements of a vector (row → row, col → col)
export const unique: BuiltinFn = async (args, _ctx) => {
  const mat = args[0] ?? {};
  const sorted = Object.keys(mat).sort((a, b) => {
    const [ar, ac] = a.split("-").map(Number);
    const [br, bc] = b.split("-").map(Number);
    return ar !== br ? ar - br : ac - bc;
  });
  const isRow = sorted.every((k) => k.startsWith("0-"));
  const vals = [...new Set(sorted.map((k) => mat[k] ?? 0))].sort((a, b) => a - b);
  const result: Matrix = {};
  vals.forEach((v, i) => { result[isRow ? `0-${i}` : `${i}-0`] = v; });
  return result;
};
