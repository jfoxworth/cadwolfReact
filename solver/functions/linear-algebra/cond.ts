import type { BuiltinFn } from "../../types";
import { matSize, toArray2d } from "./mat-utils";

// Singular values via Jacobi on the Gram matrix (shared with rank.ts)
function singularValues(arr: number[][], m: number, n: number): number[] {
  const useFat = m < n;
  const A = arr;

  // Build Gram matrix: AtA (n×n) or AAt (m×m)
  const sz = useFat ? m : n;
  const gram: number[][] = Array.from({ length: sz }, (_, i) =>
    Array.from({ length: sz }, (_, j) => {
      let s = 0;
      if (useFat) {
        for (let k = 0; k < n; k++) s += (A[i]?.[k] ?? 0) * (A[j]?.[k] ?? 0);
      } else {
        for (let k = 0; k < m; k++) s += (A[k]?.[i] ?? 0) * (A[k]?.[j] ?? 0);
      }
      return s;
    })
  );

  const S = gram.map(row => [...row]);
  for (let sweep = 0; sweep < 100 * sz * sz; sweep++) {
    let maxOff = 0, p = 0, q = 1;
    for (let i = 0; i < sz; i++) {
      for (let j = i + 1; j < sz; j++) {
        const a = Math.abs(S[i]?.[j] ?? 0);
        if (a > maxOff) { maxOff = a; p = i; q = j; }
      }
    }
    if (maxOff < 1e-12) break;
    const Spp = S[p]![p]!, Sqq = S[q]![q]!, Spq = S[p]![q]!;
    const theta = 0.5 * Math.atan2(2 * Spq, Spp - Sqq);
    const c = Math.cos(theta), s = Math.sin(theta);
    (S[p] as number[])[p] = c * c * Spp + 2 * c * s * Spq + s * s * Sqq;
    (S[q] as number[])[q] = s * s * Spp - 2 * c * s * Spq + c * c * Sqq;
    (S[p] as number[])[q] = 0; (S[q] as number[])[p] = 0;
    for (let i = 0; i < sz; i++) {
      if (i !== p && i !== q) {
        const sip = S[i]![p]!, siq = S[i]![q]!;
        (S[i] as number[])[p] = c * sip + s * siq;
        (S[i] as number[])[q] = -s * sip + c * siq;
        (S[p] as number[])[i] = S[i]![p]!;
        (S[q] as number[])[i] = S[i]![q]!;
      }
    }
  }
  return Array.from({ length: sz }, (_, i) => Math.sqrt(Math.max(0, S[i]![i]!)));
}

// cond(A) — 2-norm condition number: max_sv / min_sv.
// Returns Infinity for singular or near-singular matrices.
export const cond: BuiltinFn = async (args, _ctx) => {
  const A = args[0] ?? {};
  const [m, n] = matSize(A);
  if (m === 0 || n === 0) return { "0-0": Infinity };

  const arr = toArray2d(A, m, n);
  const svs = singularValues(arr, m, n);
  const maxSv = Math.max(...svs, 0);
  const minSv = Math.min(...svs);
  if (minSv < 1e-14 * maxSv || maxSv === 0) return { "0-0": Infinity };
  return { "0-0": maxSv / minSv };
};
