import type { BuiltinFn } from "../../types";

// any(v) — 1 if any element is nonzero, 0 otherwise
export const any: BuiltinFn = async (args, _ctx) => {
  const vals = Object.values(args[0] ?? {});
  return { "0-0": vals.some((v) => v !== 0) ? 1 : 0 };
};
