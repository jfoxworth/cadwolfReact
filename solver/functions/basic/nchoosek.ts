import type { BuiltinFn } from "../../types";

// nchoosek(n, k) — binomial coefficient C(n, k)
// Uses multiplicative formula to avoid overflow up to reasonable n.
function binom(n: number, k: number): number {
  const ni = Math.round(n);
  const ki = Math.round(k);
  if (ki < 0 || ki > ni) return 0;
  if (ki === 0 || ki === ni) return 1;
  const k2 = Math.min(ki, ni - ki);
  let r = 1;
  for (let i = 0; i < k2; i++) {
    r = r * (ni - i) / (i + 1);
  }
  return Math.round(r);
}

export const nchoosek: BuiltinFn = async (args, _ctx) => {
  const n = args[0]?.["0-0"] ?? 0;
  const k = args[1]?.["0-0"] ?? 0;
  return { "0-0": binom(n, k) };
};
