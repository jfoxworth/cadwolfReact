import type { BuiltinFn, Matrix } from "../../types";

function sortedVec(mat: Matrix): number[] {
  return Object.keys(mat)
    .sort((a, b) => {
      const [ar, ac] = a.split("-").map(Number);
      const [br, bc] = b.split("-").map(Number);
      return ar !== br ? ar - br : ac - bc;
    })
    .map((k) => mat[k] ?? 0);
}

// conv(x, h) — discrete linear convolution. Output length = len(x) + len(h) - 1.
export const conv: BuiltinFn = async (args, _ctx) => {
  const x = sortedVec(args[0] ?? {});
  const h = sortedVec(args[1] ?? {});
  const nx = x.length, nh = h.length;
  if (nx === 0 || nh === 0) return {};

  const len = nx + nh - 1;
  const out = new Array<number>(len).fill(0);
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nh; j++) out[i + j] += x[i] * h[j];
  }

  const isRow =
    Object.keys(args[0] ?? {}).every((k) => k.startsWith("0-")) ||
    Object.keys(args[1] ?? {}).every((k) => k.startsWith("0-"));
  const result: Matrix = {};
  out.forEach((v, i) => { result[isRow ? `0-${i}` : `${i}-0`] = v; });
  return result;
};
