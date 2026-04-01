import type { BuiltinFn, Matrix } from "../../types";

// Interpolate(vec, n)
// Inserts n evenly-spaced points between each pair of adjacent values in a
// row vector, producing a denser vector of length (size-1)*n + 1.
//
//   args[0] = vec — 1×N row vector
//   args[1] = n   — number of sub-intervals per segment (integer)
//
// For each segment [vec[i], vec[i+1]] the output contains n points:
//   vec[i] + k * (vec[i+1] - vec[i]) / n   for k = 0 .. n-1
// The final endpoint vec[size-1] is appended after the last segment.
export const interpolate: BuiltinFn = async (args, _ctx) => {
  const vec = args[0] ?? {};
  const n   = Math.round(args[1]?.["0-0"] ?? 1);

  const size = Object.keys(vec).length;
  if (size < 2) return vec;

  const v = (i: number) => vec[`0-${i}`] ?? 0;

  const result: Matrix = {};
  let index2 = 0;

  for (let index1 = 0; index1 < size - 1; index1++) {
    const step = (v(index1 + 1) - v(index1)) / n;
    for (let ind2 = 0; ind2 < n; ind2++) {
      result[`0-${index2}`] = v(index1) + step * ind2;
      index2++;
    }
  }

  // Append the final endpoint
  result[`0-${index2}`] = v(size - 1);

  return result;
};
