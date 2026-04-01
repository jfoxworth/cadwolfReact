import type { BuiltinFn, Matrix } from "../../types";

// randMat(lower, upper, precision, rows, cols)
// Returns a matrix filled with random numbers.
//
//   args[0] = lower     — minimum value (inclusive)
//   args[1] = upper     — maximum value
//   args[2] = precision — decimal places (e.g. 2 → steps of 0.01)
//   args[3] = rows      — number of rows in the output matrix
//   args[4] = cols      — number of columns in the output matrix
//
// Uses the same sign-branch random logic as rand().
function randValue(lower: number, upper: number, mult: number): number {
  const ran = Math.random();
  if (lower >= 0) {
    return lower + Math.floor(Math.random() * (upper * mult - lower * mult)) / mult;
  }
  return (Math.floor(ran * (upper * mult - lower * mult + 1)) + lower * mult) / mult;
}

export const randMat: BuiltinFn = async (args, _ctx) => {
  const lower     = args[0]?.["0-0"] ?? 0;
  const upper     = args[1]?.["0-0"] ?? 1;
  const precision = Math.round(args[2]?.["0-0"] ?? 0);
  const rows      = Math.round(args[3]?.["0-0"] ?? 1);
  const cols      = Math.round(args[4]?.["0-0"] ?? 1);
  const mult      = Math.pow(10, precision);

  const result: Matrix = {};
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      result[`${r}-${c}`] = randValue(lower, upper, mult);
    }
  }

  return result;
};
