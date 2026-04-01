import type { BuiltinFn, Matrix } from "../../types";

// gradient(v, h?) — central-difference gradient.
// h is the uniform spacing (default 1). Endpoints use forward/backward differences.
export const gradient: BuiltinFn = async (args, _ctx) => {
  const mat = args[0] ?? {};
  const h = args[1]?.["0-0"] ?? 1;

  const sorted = Object.keys(mat).sort((a, b) => {
    const [ar, ac] = a.split("-").map(Number);
    const [br, bc] = b.split("-").map(Number);
    return ar !== br ? ar - br : ac - bc;
  });
  const n = sorted.length;
  if (n === 0) return {};
  if (n === 1) return { [sorted[0]]: 0 };

  const vals = sorted.map((k) => mat[k] ?? 0);
  const isRow = sorted.every((k) => k.startsWith("0-"));
  const result: Matrix = {};

  for (let i = 0; i < n; i++) {
    let g: number;
    if (i === 0)         g = (vals[1] - vals[0]) / h;
    else if (i === n - 1) g = (vals[n - 1] - vals[n - 2]) / h;
    else                  g = (vals[i + 1] - vals[i - 1]) / (2 * h);
    result[isRow ? `0-${i}` : `${i}-0`] = g;
  }
  return result;
};
