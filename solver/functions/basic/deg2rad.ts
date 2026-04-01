import type { BuiltinFn, Matrix } from "../../types";

export const deg2rad: BuiltinFn = async (args, _ctx) => {
  const mat = args[0] ?? {};
  const result: Matrix = {};
  for (const [key, val] of Object.entries(mat)) {
    result[key] = val * (Math.PI / 180);
  }
  return result;
};
