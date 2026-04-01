import type { BuiltinFn, Matrix } from "../../types";

// mod(x, n) — element-wise modulo, always non-negative (matches MATLAB mod, not rem)
// mod(x, n) = x - n * floor(x/n)
export const mod: BuiltinFn = async (args, _ctx) => {
  const mat = args[0] ?? {};
  const n   = args[1]?.["0-0"] ?? 1;
  const result: Matrix = {};
  for (const [k, v] of Object.entries(mat)) {
    result[k] = n !== 0 ? v - n * Math.floor(v / n) : v;
  }
  return result;
};
