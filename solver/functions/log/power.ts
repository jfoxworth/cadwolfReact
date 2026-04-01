import type { BuiltinFn } from "../../types";
import { elementwise } from "../elementwise";

// power(base, exp) — element-wise when base is a matrix, scalar exp only
export const power: BuiltinFn = async (args, _ctx) => {
  const exp  = args[0]?.["0-0"] ?? 1;
  const base = args[1] ?? { "0-0": 0 };
  return elementwise(base, (v) => Math.pow(v, exp));
};
