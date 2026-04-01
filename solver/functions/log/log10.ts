import type { BuiltinFn } from "../../types";

export const log10: BuiltinFn = async (args, _ctx) => {
  return { '0-0': Math.log10(args[0]['0-0'] ?? 1) };
};
