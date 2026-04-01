import type { BuiltinFn } from "../../types";
import { matSize, toArray2d } from "./mat-utils";

// Compute singular values of A via the power-iteration / symmetric eigenvalue approach.
// We form A^T A (or A A^T for fat matrices), find eigenvalues via Jacobi iteration,
// and return their square roots.
function singularValues(arr: number[][], m: number, n: number): number[] {
  // Work with the smaller Gram matrix
  const useFat = m < n;
  const rows = useFat ? arr : transpose(arr, m, n);
  const cols = useFat ? transpose(arr, m, n) : arr;
  const sz = useFat ? m : n;

  // Gram = rows × cols
  const gram: number[][] = Array.from({ length: sz }, (_, i) =>
    Array.from({ length: sz }, (_, j) => {
      let s = 0;
      const len = useFat ? n : m;
      for (let k = 0; k < len; k++) s += (rows[i]?.[k] ?? 0) * (cols[k]?.[j] ?? 0);
      return s;
    })
  );

  // Jacobi eigenvalue iteration
  const V: number[][] = Array.from({ length: sz }, (_, i) =>
    Array.from({ length: sz }, (_, j) => (i === j ? 1 : 0))
  );
  const S: number[][] = gram.map(row => [...row]);

  for (let sweep = 0; sweep < 100 * sz * sz; sweep++) {
    let maxOff = 0, p = 0, q = 1;
    for (let i = 0; i < sz; i++) {
      for (let j = i + 1; j < sz; j++) {
        const abs = Math.abs(S[i]?.[j] ?? 0);
        if (abs > maxOff) { maxOff = abs; p = i; q = j; }
      }
    }
    if (maxOff < 1e-12) break;

    const Spp = S[p]?.[p] ?? 0, Sqq = S[q]?.[q] ?? 0, Spq = S[p]?.[q] ?? 0;
    const theta = 0.5 * Math.atan2(2 * Spq, Spp - Sqq);
    const c = Math.cos(theta), s = Math.sin(theta);

    // Update S
    const newSpp = c * c * Spp + 2 * c * s * Spq + s * s * Sqq;
    const newSqq = s * s * Spp - 2 * c * s * Spq + c * c * Sqq;
    (S[p] as number[])[p] = newSpp;
    (S[q] as number[])[q] = newSqq;
    (S[p] as number[])[q] = 0;
    (S[q] as number[])[p] = 0;
    for (let i = 0; i < sz; i++) {
      if (i !== p && i !== q) {
        const sip = S[i]?.[p] ?? 0, siq = S[i]?.[q] ?? 0;
        (S[i] as number[])[p] = c * sip + s * siq;
        (S[i] as number[])[q] = -s * sip + c * siq;
        (S[p] as number[])[i] = S[i]?.[p] ?? 0;
        (S[q] as number[])[i] = S[i]?.[q] ?? 0;
      }
    }
  }

  return Array.from({ length: sz }, (_, i) => Math.sqrt(Math.max(0, S[i]?.[i] ?? 0)));
}

function transpose(A: number[][], m: number, n: number): number[][] {
  return Array.from({ length: n }, (_, j) =>
    Array.from({ length: m }, (_, i) => A[i]?.[j] ?? 0)
  );
}

// rank(A) — numerical rank of A (number of singular values above threshold)
export const rank: BuiltinFn = async (args, _ctx) => {
  const A = args[0] ?? {};
  const [m, n] = matSize(A);
  if (m === 0 || n === 0) return { "0-0": 0 };

  const arr = toArray2d(A, m, n);
  const svs = singularValues(arr, m, n);
  const maxSv = Math.max(...svs, 0);
  const tol = Math.max(m, n) * maxSv * 2.2e-16;
  const r = svs.filter(v => v > tol).length;
  return { "0-0": r };
};
