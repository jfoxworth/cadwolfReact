import type { BuiltinFn, Matrix } from "../../types";

// sort(v, dir?) — sort vector elements. dir: 1=ascending (default), -1=descending
export const sort: BuiltinFn = async (args, _ctx) => {
  const mat = args[0] ?? {};
  const dir = (args[1]?.["0-0"] ?? 1) >= 0 ? 1 : -1;

  const sorted = Object.keys(mat).sort((a, b) => {
    const [ar, ac] = a.split("-").map(Number);
    const [br, bc] = b.split("-").map(Number);
    return ar !== br ? ar - br : ac - bc;
  });

  const vals = sorted.map((k) => mat[k] ?? 0).sort((a, b) => dir * (a - b));
  const isRow = sorted.every((k) => k.startsWith("0-"));
  const result: Matrix = {};
  vals.forEach((v, i) => { result[isRow ? `0-${i}` : `${i}-0`] = v; });
  return result;
};
