import type { BuiltinFn, Matrix } from "../../types";

// cumprod(x) — cumulative product of elements, preserving vector shape
export const cumprod: BuiltinFn = async (args, _ctx) => {
  const A = args[0] ?? {};
  const sorted = Object.keys(A).sort((a, b) => {
    const [ar, ac] = a.split("-").map(Number);
    const [br, bc] = b.split("-").map(Number);
    return ar !== br ? ar - br : ac - bc;
  });
  if (sorted.length === 0) return {};
  let acc = 1;
  const result: Matrix = {};
  for (const k of sorted) {
    acc *= A[k] ?? 1;
    result[k] = acc;
  }
  return result;
};
