import type { BuiltinFn, Matrix } from "../../types";

// repeat(x, n) — repeat each element of x consecutively n times
// [1, 2, 3] with n=2 → [1, 1, 2, 2, 3, 3]
// Output is always a row vector.
export const repeatElem: BuiltinFn = async (args, _ctx) => {
  const A = args[0] ?? {};
  const n = Math.max(1, Math.round(args[1]?.["0-0"] ?? 1));

  const sorted = Object.keys(A).sort((a, b) => {
    const [ar, ac] = a.split("-").map(Number);
    const [br, bc] = b.split("-").map(Number);
    return ar !== br ? ar - br : ac - bc;
  });
  if (sorted.length === 0) return {};

  const result: Matrix = {};
  let outIdx = 0;
  for (const k of sorted) {
    const v = A[k] ?? 0;
    for (let i = 0; i < n; i++) result[`0-${outIdx++}`] = v;
  }
  return result;
};
