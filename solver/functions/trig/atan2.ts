import type { BuiltinFn } from "../../types";

export const atan2: BuiltinFn = async (args, _ctx) => {
  return { '0-0': Math.atan2(args[0]['0-0'] ?? 0, args[1]['0-0'] ?? 0) };
};
