import type { BuiltinFn, Matrix } from "../../types";

// kron(A, B) — Kronecker tensor product
export const kron: BuiltinFn = async (args, _ctx) => {
  const A = args[0] ?? {};
  const B = args[1] ?? {};

  let aRows = 0, aCols = 0, bRows = 0, bCols = 0;
  for (const k of Object.keys(A)) {
    const [r, c] = k.split("-").map(Number);
    if (r >= aRows) aRows = r + 1;
    if (c >= aCols) aCols = c + 1;
  }
  for (const k of Object.keys(B)) {
    const [r, c] = k.split("-").map(Number);
    if (r >= bRows) bRows = r + 1;
    if (c >= bCols) bCols = c + 1;
  }
  if (aRows === 0 || bRows === 0) return {};

  const result: Matrix = {};
  for (let ar = 0; ar < aRows; ar++) {
    for (let ac = 0; ac < aCols; ac++) {
      const aVal = A[`${ar}-${ac}`] ?? 0;
      for (let br = 0; br < bRows; br++) {
        for (let bc = 0; bc < bCols; bc++) {
          result[`${ar * bRows + br}-${ac * bCols + bc}`] = aVal * (B[`${br}-${bc}`] ?? 0);
        }
      }
    }
  }
  return result;
};
