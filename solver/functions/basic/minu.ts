import type { BuiltinFn } from "../../types";

export const minu: BuiltinFn = async (args, _ctx) => {
  return { '0-0': Math.min(...Object.values(args[0])) };
};
