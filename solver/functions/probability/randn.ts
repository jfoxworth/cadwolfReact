import type { BuiltinFn, Matrix } from "../../types";

// randn(rows, cols) — matrix of standard normal random values via Box-Muller transform.
// Default: scalar (1×1). randn(n) → n×1 column. randn(m, n) → m×n matrix.
export const randn: BuiltinFn = async (args, _ctx) => {
  const rowsArg = args[0] ?? {};
  const colsArg = args[1] ?? {};

  const rows = Math.max(1, Math.round(rowsArg["0-0"] ?? 1));
  const cols = Math.max(1, Math.round(colsArg["0-0"] ?? (Object.keys(rowsArg).length === 0 ? 1 : 1)));

  const result: Matrix = {};
  let spare: number | null = null;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let z: number;
      if (spare !== null) {
        z = spare;
        spare = null;
      } else {
        // Box-Muller
        const u1 = Math.random();
        const u2 = Math.random();
        const mag = Math.sqrt(-2 * Math.log(u1 || 1e-300));
        z = mag * Math.cos(2 * Math.PI * u2);
        spare = mag * Math.sin(2 * Math.PI * u2);
      }
      result[`${r}-${c}`] = z;
    }
  }
  return result;
};
