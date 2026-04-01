import type { BuiltinFn } from "../../types";

export const log: BuiltinFn = async (args, _ctx) => {
  const b=args[1]?.['0-0'] ?? 10; return { '0-0': Math.log(args[0]['0-0'] ?? 1)/Math.log(b) };
};
