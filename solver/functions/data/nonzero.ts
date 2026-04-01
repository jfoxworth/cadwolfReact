import type { BuiltinFn, Matrix } from "../../types";

// nonzero(x) — returns a row vector of 0-based linear indices where x != 0
// Elements are scanned in row-major order.
export const nonzero: BuiltinFn = async (args, _ctx) => {
  const A = args[0] ?? {};
  const sorted = Object.keys(A).sort((a, b) => {
    const [ar, ac] = a.split("-").map(Number);
    const [br, bc] = b.split("-").map(Number);
    return ar !== br ? ar - br : ac - bc;
  });

  const result: Matrix = {};
  let outIdx = 0;
  for (let i = 0; i < sorted.length; i++) {
    if ((A[sorted[i]!] ?? 0) !== 0) result[`0-${outIdx++}`] = i;
  }
  if (outIdx === 0) return {};
  return result;
};
