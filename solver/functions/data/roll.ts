import type { BuiltinFn, Matrix } from "../../types";

// roll(x, n) — circular shift elements of x by n positions
// Positive n shifts right (toward higher indices); negative shifts left.
export const roll: BuiltinFn = async (args, _ctx) => {
  const A = args[0] ?? {};
  const n = Math.round(args[1]?.["0-0"] ?? 0);

  const sorted = Object.keys(A).sort((a, b) => {
    const [ar, ac] = a.split("-").map(Number);
    const [br, bc] = b.split("-").map(Number);
    return ar !== br ? ar - br : ac - bc;
  });
  const len = sorted.length;
  if (len === 0) return {};

  const shift = ((n % len) + len) % len; // normalise to [0, len)
  const result: Matrix = {};
  for (let i = 0; i < len; i++) {
    const srcKey = sorted[((i - shift + len) % len)]!;
    result[sorted[i]!] = A[srcKey] ?? 0;
  }
  return result;
};
