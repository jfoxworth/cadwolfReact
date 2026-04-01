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

// trapz(y, x?) — trapezoidal numerical integration
// If x is provided, uses non-uniform spacing. Otherwise assumes unit spacing.
export const trapz: BuiltinFn = async (args, _ctx) => {
  const y = sortedVec(args[0] ?? {});
  const n = y.length;
  if (n < 2) return { "0-0": 0 };

  let sum = 0;
  if (args[1] !== undefined) {
    const x = sortedVec(args[1]);
    for (let i = 0; i < n - 1; i++) sum += 0.5 * (y[i] + y[i + 1]) * (x[i + 1] - x[i]);
  } else {
    for (let i = 0; i < n - 1; i++) sum += 0.5 * (y[i] + y[i + 1]);
  }
  return { "0-0": sum };
};
