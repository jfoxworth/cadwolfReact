import type { BuiltinFn, Matrix } from "../../types";

// matPow(A, n)  →  A^n  (repeated matrix multiplication, n must be a non-negative integer)
// args[0] = A  — square matrix
// args[1] = n  — scalar non-negative integer exponent
// Returns A^n; A^0 = identity, A^1 = A, A^2 = A*A, etc.
export const matPow: BuiltinFn = async (args, _ctx) => {
  const A = args[0] ?? {};
  const n = Math.round(args[1]?.["0-0"] ?? 0);

  const keys = Object.keys(A);
  if (keys.length === 0) return { "0-0": 0 };

  let dim = 0;
  for (const k of keys) {
    const r = parseInt(k.split("-")[0], 10);
    if (r >= dim) dim = r + 1;
  }

  const get = (m: Matrix, r: number, c: number) => m[`${r}-${c}`] ?? 0;

  function matMul(X: Matrix, Y: Matrix): Matrix {
    const out: Matrix = {};
    for (let r = 0; r < dim; r++)
      for (let c = 0; c < dim; c++) {
        let sum = 0;
        for (let k = 0; k < dim; k++) sum += get(X, r, k) * get(Y, k, c);
        out[`${r}-${c}`] = sum;
      }
    return out;
  }

  // Identity
  let result: Matrix = {};
  for (let i = 0; i < dim; i++) result[`${i}-${i}`] = 1;

  // result = A^n via n multiplications
  for (let p = 0; p < n; p++) result = matMul(result, A);

  return result;
};
