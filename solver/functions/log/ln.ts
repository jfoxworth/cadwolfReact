import type { BuiltinFn } from "../../types";

export const ln: BuiltinFn = async (args, _ctx) => {
  return { '0-0': Math.log(args[0]['0-0'] ?? 1) };
};
