import type { BuiltinFn, Matrix } from "../../types";

// searchsorted(a, v) — find insertion indices to keep a sorted
// a: sorted vector; v: scalar or vector of query values
// Returns index i such that a[i-1] < v <= a[i] (left-closed, right-open convention).
// Equivalent to numpy searchsorted with side='right'.
export const searchsorted: BuiltinFn = async (args, _ctx) => {
  const a = args[0] ?? {};
  const v = args[1] ?? {};

  // Build sorted array from a
  const aVals = Object.keys(a)
    .sort((x, y) => {
      const [xr, xc] = x.split("-").map(Number);
      const [yr, yc] = y.split("-").map(Number);
      return xr !== yr ? xr - yr : xc - yc;
    })
    .map(k => a[k] ?? 0);

  function bisect(val: number): number {
    let lo = 0, hi = aVals.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if ((aVals[mid] ?? 0) <= val) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  const vKeys = Object.keys(v).sort((x, y) => {
    const [xr, xc] = x.split("-").map(Number);
    const [yr, yc] = y.split("-").map(Number);
    return xr !== yr ? xr - yr : xc - yc;
  });

  if (vKeys.length === 0) return {};

  // Scalar v → scalar result
  if (vKeys.length === 1) return { "0-0": bisect(v["0-0"] ?? 0) };

  // Vector v → row vector of indices
  const result: Matrix = {};
  vKeys.forEach((k, i) => { result[`0-${i}`] = bisect(v[k] ?? 0); });
  return result;
};
