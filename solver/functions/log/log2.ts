import type { BuiltinFn, Matrix } from "../../types";

export const log2: BuiltinFn = async (args, _ctx) => {
  const mat = args[0] ?? {};
  const result: Matrix = {};
  for (const [key, val] of Object.entries(mat)) {
    result[key] = Math.log2(val);
  }
  return result;
};
