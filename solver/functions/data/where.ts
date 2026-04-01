import type { BuiltinFn, Matrix } from "../../types";

// where(cond, a, b) — element-wise conditional selection
// For each element: result = cond != 0 ? a : b
// a and b can be scalars (1×1) or full matrices matching cond's shape.
export const where: BuiltinFn = async (args, _ctx) => {
  const cond = args[0] ?? {};
  const a    = args[1] ?? {};
  const b    = args[2] ?? {};

  const scalarA = Object.keys(a).length === 1 && "0-0" in a;
  const scalarB = Object.keys(b).length === 1 && "0-0" in b;

  const result: Matrix = {};
  for (const [k, v] of Object.entries(cond)) {
    const aVal = scalarA ? (a["0-0"] ?? 0) : (a[k] ?? 0);
    const bVal = scalarB ? (b["0-0"] ?? 0) : (b[k] ?? 0);
    result[k] = (v ?? 0) !== 0 ? aVal : bVal;
  }
  return result;
};
