import type { BuiltinFn } from "../../types";

// all(v) — 1 if all elements are nonzero, 0 otherwise
export const all: BuiltinFn = async (args, _ctx) => {
  const vals = Object.values(args[0] ?? {});
  if (vals.length === 0) return { "0-0": 1 };
  return { "0-0": vals.every((v) => v !== 0) ? 1 : 0 };
};
