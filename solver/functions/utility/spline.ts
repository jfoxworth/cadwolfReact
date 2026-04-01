import type { BuiltinFn, Matrix } from "../../types";

function sortedValues(mat: Matrix): number[] {
  return Object.keys(mat)
    .sort((a, b) => {
      const [ar, ac] = a.split("-").map(Number);
      const [br, bc] = b.split("-").map(Number);
      return ar !== br ? ar - br : ac - bc;
    })
    .map((k) => mat[k] ?? 0);
}

/**
 * Compute second derivatives M[0..n] for a natural cubic spline.
 * Natural boundary conditions: M[0] = M[n] = 0.
 * Uses the Thomas algorithm (tridiagonal solver).
 */
function computeM(xs: number[], ys: number[]): number[] {
  const n = xs.length - 1;
  const M = new Array(n + 1).fill(0);
  if (n < 2) return M; // linear — second derivatives all zero

  const h = Array.from({ length: n }, (_, i) => xs[i + 1] - xs[i]);

  // Interior unknowns: M[1] ... M[n-1], size = n-1
  const sz = n - 1;
  const diag  = new Array(sz).fill(0);
  const upper = new Array(sz).fill(0); // upper[i] connects row i to row i+1
  const rhs   = new Array(sz).fill(0);

  for (let i = 0; i < sz; i++) {
    const j = i + 1; // index in xs/ys
    diag[i]  = 2 * (h[j - 1] + h[j]);
    upper[i] = h[j]; // used in forward elimination only up to sz-2
    rhs[i]   = 6 * ((ys[j + 1] - ys[j]) / h[j] - (ys[j] - ys[j - 1]) / h[j - 1]);
  }

  // Thomas forward sweep
  const d = [...diag];
  const b = [...rhs];
  for (let i = 1; i < sz; i++) {
    const w = h[i] / d[i - 1]; // h[i] is the sub-diagonal entry
    d[i] -= w * upper[i - 1];
    b[i] -= w * b[i - 1];
  }

  // Back substitution
  const x = new Array(sz).fill(0);
  x[sz - 1] = b[sz - 1] / d[sz - 1];
  for (let i = sz - 2; i >= 0; i--) {
    x[i] = (b[i] - upper[i] * x[i + 1]) / d[i];
  }

  for (let i = 0; i < sz; i++) M[i + 1] = x[i];
  return M;
}

/**
 * Evaluate the natural cubic spline at a single query point t.
 * Extrapolates linearly beyond the data range.
 */
function evalSpline(xs: number[], ys: number[], M: number[], t: number): number {
  const n = xs.length - 1;

  // Find interval via binary search
  let lo = 0, hi = n - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (t > xs[mid + 1]) lo = mid + 1;
    else hi = mid;
  }
  const j  = lo;
  const hj = xs[j + 1] - xs[j];
  const dt  = t - xs[j];
  const dt1 = xs[j + 1] - t;

  return (
    (dt1 * dt1 * dt1 * M[j] + dt * dt * dt * M[j + 1]) / (6 * hj) +
    (ys[j]     / hj - M[j]     * hj / 6) * dt1 +
    (ys[j + 1] / hj - M[j + 1] * hj / 6) * dt
  );
}

/**
 * spline(x, y, xi) — natural cubic spline interpolation.
 *
 * x  : row/col vector of n knot x-values (must be strictly increasing)
 * y  : row/col vector of n knot y-values
 * xi : scalar or row/col vector of query x-values
 *
 * Returns a vector of interpolated y-values at xi.
 * Uses natural (not-a-knot) boundary conditions: S''(x0) = S''(xn) = 0.
 * Extrapolation beyond the data range uses the endpoint cubic polynomial.
 */
export const spline: BuiltinFn = async (args, _ctx) => {
  const xs = sortedValues(args[0] ?? {});
  const ys = sortedValues(args[1] ?? {});
  const xiKeys = Object.keys(args[2] ?? {}).sort((a, b) => {
    const [ar, ac] = a.split("-").map(Number);
    const [br, bc] = b.split("-").map(Number);
    return ar !== br ? ar - br : ac - bc;
  });

  const n = Math.min(xs.length, ys.length);
  if (n < 2 || xiKeys.length === 0) return { "0-0": ys[0] ?? 0 };

  // Trim to matched length and ensure xs is sorted
  const xk = xs.slice(0, n);
  const yk = ys.slice(0, n);
  const M  = computeM(xk, yk);

  const isRow = xiKeys.every((k) => k.startsWith("0-"));
  const mat   = args[2] ?? {};
  const result: Matrix = {};

  xiKeys.forEach((k, i) => {
    const t     = mat[k] ?? 0;
    const outKey = isRow ? `0-${i}` : `${i}-0`;
    result[outKey] = evalSpline(xk, yk, M, t);
  });

  return result;
};
