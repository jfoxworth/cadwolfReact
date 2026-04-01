import type { BuiltinFn } from "../../types";

export const maxu: BuiltinFn = async (args, _ctx) => {
  return { '0-0': Math.max(...Object.values(args[0])) };
};
