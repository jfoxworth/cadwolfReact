import type { BuiltinFn } from "../../types";

function gcdTwo(a: number, b: number): number {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b !== 0) { const t = b; b = a % b; a = t; }
  return a;
}

// gcd(a, b) — greatest common divisor (scalar or element-wise over matching keys)
export const gcd: BuiltinFn = async (args, _ctx) => {
  const x = args[0] ?? {};
  const y = args[1] ?? {};
  const keys = Object.keys(x);
  const yScalar = y["0-0"] ?? 0;
  const yIsScalar = Object.keys(y).length <= 1;
  const result: Record<string, number> = {};
  for (const k of keys) {
    result[k] = gcdTwo(x[k] ?? 0, yIsScalar ? yScalar : (y[k] ?? 0));
  }
  return result;
};
