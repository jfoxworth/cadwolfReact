import type { BuiltinFn, Matrix } from "../../types";

// diag(mat, offset?)
// Dual-purpose — behaviour depends on the shape of the input:
//
// INPUT IS A ROW VECTOR (1×N):
//   Creates a square diagonal matrix of size (N+|offset|) × (N+|offset|).
//   offset >= 0 → place the vector on the k-th superdiagonal (default k=0, main diagonal)
//   offset <  0 → place the vector on the k-th subdiagonal
//
// INPUT IS A MATRIX (R×C):
//   Extracts the diagonal (or off-diagonal) as a 1×(R-|offset|) row vector.
//   offset >= 0 → extract k-th superdiagonal
//   offset <  0 → extract k-th subdiagonal
//
//   args[0] = mat    — row vector or matrix
//   args[1] = offset — integer offset (optional, defaults to 0)
export const diag: BuiltinFn = async (args, _ctx) => {
  const mat    = args[0] ?? {};
  const offset = Math.round(args[1]?.["0-0"] ?? 0);

  // Determine shape
  let maxRow = 0, maxCol = 0;
  for (const key of Object.keys(mat)) {
    const [r, c] = key.split("-").map(Number);
    if (r > maxRow) maxRow = r;
    if (c > maxCol) maxCol = c;
  }
  const rows = maxRow + 1;
  const cols = maxCol + 1;

  const result: Matrix = {};

  if (rows === 1) {
    // ── Vector → diagonal matrix ──────────────────────────────────────────
    const n    = cols;
    const size = n + Math.abs(offset);

    for (let a = 0; a < size; a++) {
      for (let b = 0; b < size; b++) {
        result[`${a}-${b}`] = 0;
        if (offset < 0) {
          // subdiagonal: condition is a + offset == b  →  b = a - |offset|
          if (a + offset === b) {
            result[`${a}-${b}`] = mat[`0-${a + offset}`] ?? 0;
          }
        } else {
          // main or superdiagonal: condition is a == b - offset
          if (a === b - offset) {
            result[`${a}-${b}`] = mat[`0-${a}`] ?? 0;
          }
        }
      }
    }
  } else {
    // ── Matrix → extract diagonal ─────────────────────────────────────────
    const len = rows - Math.abs(offset);
    for (let a = 0; a < len; a++) {
      if (offset < 0) {
        const row = Math.abs(offset) + a;
        result[`0-${a}`] = mat[`${row}-${a}`] ?? 0;
      } else {
        const col = offset + a;
        result[`0-${a}`] = mat[`${a}-${col}`] ?? 0;
      }
    }
  }

  return result;
};
