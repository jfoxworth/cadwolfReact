import type { BuiltinFn } from "../../types";

// prod(x) — product of all elements in x
export const prod: BuiltinFn = async (args, _ctx) => {
  const A = args[0] ?? {};
  const keys = Object.keys(A);
  if (keys.length === 0) return { "0-0": 1 };
  let p = 1;
  for (const k of keys) p *= A[k] ?? 1;
  return { "0-0": p };
};
