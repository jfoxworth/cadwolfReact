import type { BuiltinFn } from "../../types";

// count-nonzero(x) — number of nonzero elements in x
export const countNonzero: BuiltinFn = async (args, _ctx) => {
  const A = args[0] ?? {};
  let count = 0;
  for (const v of Object.values(A)) if ((v ?? 0) !== 0) count++;
  return { "0-0": count };
};
