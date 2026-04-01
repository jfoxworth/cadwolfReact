import type { BuiltinFn } from "../../types";

function gcdTwo(a: number, b: number): number {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b !== 0) { const t = b; b = a % b; a = t; }
  return a;
}

// lcm(a, b) — least common multiple
export const lcm: BuiltinFn = async (args, _ctx) => {
  const x = args[0] ?? {};
  const y = args[1] ?? {};
  const keys = Object.keys(x);
  const yScalar = y["0-0"] ?? 0;
  const yIsScalar = Object.keys(y).length <= 1;
  const result: Record<string, number> = {};
  for (const k of keys) {
    const a = Math.abs(Math.round(x[k] ?? 0));
    const b = Math.abs(Math.round(yIsScalar ? yScalar : (y[k] ?? 0)));
    const g = gcdTwo(a, b);
    result[k] = g === 0 ? 0 : (a / g) * b;
  }
  return result;
};
