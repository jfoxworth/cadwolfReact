import type { BuiltinFn } from "../../types";
import { elementwise } from "../elementwise";

function fact(n: number): number {
  const k = Math.round(Math.abs(n));
  if (k > 170) return Infinity;
  let r = 1;
  for (let i = 2; i <= k; i++) r *= i;
  return r;
}

// factorial(n) — element-wise n! (non-negative integers; |n| used, rounds to nearest int)
export const factorial: BuiltinFn = async (args) => elementwise(args[0] ?? {}, fact);
