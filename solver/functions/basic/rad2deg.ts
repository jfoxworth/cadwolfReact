import type { BuiltinFn, Matrix } from "../../types";

export const rad2deg: BuiltinFn = async (args, _ctx) => {
  const mat = args[0] ?? {};
  const result: Matrix = {};
  for (const [key, val] of Object.entries(mat)) {
    result[key] = val * (180 / Math.PI);
  }
  return result;
};
