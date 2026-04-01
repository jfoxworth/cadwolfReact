import type { BuiltinFn } from "../../types";

// rand(lower, upper, precision)
// Returns a single random number between lower and upper.
//
//   args[0] = lower     — minimum value (inclusive)
//   args[1] = upper     — maximum value
//   args[2] = precision — decimal places (optional, defaults to 0 = integers)
//
// precision=0 → integer steps (mult=1), precision=2 → steps of 0.01, etc.
// Replicates the original rand() logic including the lower/upper sign branches.
function randValue(lower: number, upper: number, mult: number): number {
  const ran = Math.random();
  if (lower >= 0) {
    return lower + Math.floor(Math.random() * (upper * mult - lower * mult)) / mult;
  }
  return (Math.floor(ran * (upper * mult - lower * mult + 1)) + lower * mult) / mult;
}

export const rand: BuiltinFn = async (args, _ctx) => {
  const lower     = args[0]?.["0-0"] ?? 0;
  const upper     = args[1]?.["0-0"] ?? 1;
  const precision = Math.round(args[2]?.["0-0"] ?? 0);
  const mult      = Math.pow(10, precision);

  return { "0-0": randValue(lower, upper, mult) };
};
