import type { BuiltinFn, Matrix } from "../../types";

// cummax(x) — running maximum of elements, preserving vector shape
export const cummax: BuiltinFn = async (args, _ctx) => {
  const A = args[0] ?? {};
  const sorted = Object.keys(A).sort((a, b) => {
    const [ar, ac] = a.split("-").map(Number);
    const [br, bc] = b.split("-").map(Number);
    return ar !== br ? ar - br : ac - bc;
  });
  if (sorted.length === 0) return {};
  let running = -Infinity;
  const result: Matrix = {};
  for (const k of sorted) {
    const v = A[k] ?? 0;
    if (v > running) running = v;
    result[k] = running;
  }
  return result;
};
