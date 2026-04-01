import type { BuiltinFn, Matrix } from "../../types";

// argsort(x, dir?) — returns the 0-based indices that would sort x
// dir >= 0 (default) = ascending, dir < 0 = descending
// Output is always a row vector.
export const argsort: BuiltinFn = async (args, _ctx) => {
  const A = args[0] ?? {};
  const dir = (args[1]?.["0-0"] ?? 0) < 0 ? -1 : 1;

  const sorted = Object.keys(A).sort((a, b) => {
    const [ar, ac] = a.split("-").map(Number);
    const [br, bc] = b.split("-").map(Number);
    return ar !== br ? ar - br : ac - bc;
  });

  if (sorted.length === 0) return {};

  // pair each linear position with its value
  const pairs = sorted.map((k, i) => ({ i, v: A[k] ?? 0 }));
  pairs.sort((a, b) => dir * (a.v - b.v));

  const result: Matrix = {};
  pairs.forEach(({ i }, j) => { result[`0-${j}`] = i; });
  return result;
};
