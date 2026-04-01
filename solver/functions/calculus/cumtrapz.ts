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

// cumtrapz(y, x?) — cumulative trapezoidal integration
// Returns a vector the same length as y, starting from 0 at index 0.
export const cumtrapz: BuiltinFn = async (args, _ctx) => {
  const yKeys = Object.keys(args[0] ?? {}).sort((a, b) => {
    const [ar, ac] = a.split("-").map(Number);
    const [br, bc] = b.split("-").map(Number);
    return ar !== br ? ar - br : ac - bc;
  });
  const y = yKeys.map((k) => (args[0] ?? {})[k] ?? 0);
  const n = y.length;
  if (n === 0) return {};

  const isRow = yKeys.every((k) => k.startsWith("0-"));
  const x = args[1] !== undefined ? sortedVec(args[1]) : y.map((_, i) => i);

  const result: Matrix = {};
  result[isRow ? "0-0" : "0-0"] = 0;
  let acc = 0;
  for (let i = 0; i < n - 1; i++) {
    acc += 0.5 * (y[i] + y[i + 1]) * (x[i + 1] - x[i]);
    result[isRow ? `0-${i + 1}` : `${i + 1}-0`] = acc;
  }
  return result;
};
