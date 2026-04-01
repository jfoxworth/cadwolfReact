import type { BuiltinFn, Matrix } from "../../types";

function sortedVec(mat: Matrix): number[] {
  return Object.keys(mat)
    .sort((a, b) => {
      const [ar, ac] = a.split("-").map(Number);
      const [br, bc] = b.split("-").map(Number);
      return ar !== br ? ar - br : ac - bc;
    })
    .map(k => mat[k] ?? 0);
}

// meshgrid(x, y, which?)
// Creates a coordinate grid from vectors x (length n) and y (length m).
// which = 1 (default): returns X — an m×n matrix where X[i][j] = x[j]
// which = 2:           returns Y — an m×n matrix where Y[i][j] = y[i]
export const meshgrid: BuiltinFn = async (args, _ctx) => {
  const xVec = sortedVec(args[0] ?? {});
  const yVec = sortedVec(args[1] ?? {});
  const which = Math.round(args[2]?.["0-0"] ?? 1);

  const n = xVec.length; // cols
  const m = yVec.length; // rows

  if (n === 0 || m === 0) return {};

  const result: Matrix = {};
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      result[`${i}-${j}`] = which === 2 ? (yVec[i] ?? 0) : (xVec[j] ?? 0);
    }
  }
  return result;
};
