import type { Matrix } from "../types";

// ─── Token encoding ──────────────────────────────────────────────────────────
// Real-only:            MATRIX::{real_json}::{size}
// Complex:              MATRIX::{real_json}::{size}::IMAG::{imag_json}
// With units:           MATRIX::{real_json}::{size}::UNITS::{baseArray_json}
// Complex with units:   MATRIX::{real_json}::{size}::IMAG::{imag_json}::UNITS::{baseArray_json}
// Imaginary scalar:     IMAG::{number}   (produced by step 18, consumed by step 26)

export const MATRIX_TOKEN_PREFIX = "MATRIX::";
export const IMAG_TOKEN_PREFIX   = "IMAG::";

export interface MatrixItem {
  real: Matrix;
  imag: Matrix; // empty {} means all-zero imaginary part
  size: string; // "rowsxcols"
  baseArray?: number[]; // SI unit exponents [A, K, s, m, kg, cd, mol, rad]
}

export function encodeMatrix(real: Matrix, size: string, imag?: Matrix, baseArray?: number[]): string {
  let result = `${MATRIX_TOKEN_PREFIX}${JSON.stringify(real)}::${size}`;
  if (imag && Object.values(imag).some((v) => v !== 0)) {
    result += `::IMAG::${JSON.stringify(imag)}`;
  }
  if (baseArray && baseArray.some((v) => v !== 0)) {
    result += `::UNITS::${JSON.stringify(baseArray)}`;
  }
  return result;
}

export function isMatrixToken(tok: string): boolean {
  return tok.startsWith(MATRIX_TOKEN_PREFIX);
}

export function isImagToken(tok: string): boolean {
  return tok.startsWith(IMAG_TOKEN_PREFIX) && !tok.startsWith(MATRIX_TOKEN_PREFIX);
}

export function decodeMatrix(tok: string): MatrixItem | null {
  if (!isMatrixToken(tok)) return null;

  let working = tok;
  let baseArray: number[] | undefined;
  let imag: Matrix = {};

  // Strip ::UNITS::{json} from the right end first
  const unitsMarker = "::UNITS::";
  const unitsIdx = working.lastIndexOf(unitsMarker);
  if (unitsIdx >= 0) {
    try { baseArray = JSON.parse(working.slice(unitsIdx + unitsMarker.length)) as number[]; } catch { /* ignore */ }
    working = working.slice(0, unitsIdx);
  }

  // Strip ::IMAG::{json}
  const imagMarker = "::IMAG::";
  const imagIdx = working.indexOf(imagMarker, MATRIX_TOKEN_PREFIX.length + 1);
  if (imagIdx >= 0) {
    try { imag = JSON.parse(working.slice(imagIdx + imagMarker.length)) as Matrix; } catch { /* ignore */ }
    working = working.slice(0, imagIdx);
  }

  // Parse MATRIX::{real}::{size}
  const rest = working.slice(MATRIX_TOKEN_PREFIX.length);
  const lastSep = rest.lastIndexOf("::");
  if (lastSep < 0) return null;
  try {
    const real = JSON.parse(rest.slice(0, lastSep)) as Matrix;
    const size = rest.slice(lastSep + 2);
    return { real, imag, size, baseArray };
  } catch {
    return null;
  }
}

// ─── Dimension helpers ───────────────────────────────────────────────────────

export function sizeToRowsCols(size: string): [number, number] {
  const parts = size.split("x");
  return [Number(parts[0]) || 1, Number(parts[1]) || 1];
}

// ─── Real-only matrix arithmetic (kept for callers that don't need complex) ──

export function matAdd(a: Matrix, b: Matrix, size: string): Matrix {
  const [rows, cols] = sizeToRowsCols(size);
  const result: Matrix = {};
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[`${r}-${c}`] = (a[`${r}-${c}`] ?? 0) + (b[`${r}-${c}`] ?? 0);
  return result;
}

export function matSub(a: Matrix, b: Matrix, size: string): Matrix {
  const [rows, cols] = sizeToRowsCols(size);
  const result: Matrix = {};
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[`${r}-${c}`] = (a[`${r}-${c}`] ?? 0) - (b[`${r}-${c}`] ?? 0);
  return result;
}

export function matScalarMul(mat: Matrix, size: string, scalar: number): Matrix {
  const [rows, cols] = sizeToRowsCols(size);
  const result: Matrix = {};
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[`${r}-${c}`] = (mat[`${r}-${c}`] ?? 0) * scalar;
  return result;
}

// Matrix multiplication (real only): (aRows x aCols) * (bRows x bCols)
export function matMul(
  a: Matrix, aSize: string,
  b: Matrix, bSize: string,
): MatrixItem | null {
  const [aRows, aCols] = sizeToRowsCols(aSize);
  const [bRows, bCols] = sizeToRowsCols(bSize);
  if (aCols !== bRows) return null;
  const result: Matrix = {};
  for (let r = 0; r < aRows; r++)
    for (let c = 0; c < bCols; c++) {
      let sum = 0;
      for (let k = 0; k < aCols; k++)
        sum += (a[`${r}-${k}`] ?? 0) * (b[`${k}-${c}`] ?? 0);
      result[`${r}-${c}`] = sum;
    }
  return { real: result, imag: {}, size: `${aRows}x${bCols}` };
}

// ─── Complex matrix arithmetic ───────────────────────────────────────────────

export function cMatAdd(a: MatrixItem, b: MatrixItem): MatrixItem {
  const [rows, cols] = sizeToRowsCols(a.size);
  const real: Matrix = {};
  const imag: Matrix = {};
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const k = `${r}-${c}`;
      real[k] = (a.real[k] ?? 0) + (b.real[k] ?? 0);
      imag[k] = (a.imag[k] ?? 0) + (b.imag[k] ?? 0);
    }
  return { real, imag, size: a.size };
}

export function cMatSub(a: MatrixItem, b: MatrixItem): MatrixItem {
  const [rows, cols] = sizeToRowsCols(a.size);
  const real: Matrix = {};
  const imag: Matrix = {};
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const k = `${r}-${c}`;
      real[k] = (a.real[k] ?? 0) - (b.real[k] ?? 0);
      imag[k] = (a.imag[k] ?? 0) - (b.imag[k] ?? 0);
    }
  return { real, imag, size: a.size };
}

// Complex scalar + matrix element-wise: adds (sr + si·i) to each element
export function cMatScalarAdd(mat: MatrixItem, sr: number, si: number): MatrixItem {
  const [rows, cols] = sizeToRowsCols(mat.size);
  const real: Matrix = {};
  const imag: Matrix = {};
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const k = `${r}-${c}`;
      real[k] = (mat.real[k] ?? 0) + sr;
      imag[k] = (mat.imag[k] ?? 0) + si;
    }
  return { real, imag, size: mat.size };
}

// Complex scalar - matrix element-wise: (sr + si·i) - each element
export function cMatScalarSub(scalar: { real: number; imag: number }, mat: MatrixItem): MatrixItem {
  const [rows, cols] = sizeToRowsCols(mat.size);
  const real: Matrix = {};
  const imag: Matrix = {};
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const k = `${r}-${c}`;
      real[k] = scalar.real - (mat.real[k] ?? 0);
      imag[k] = scalar.imag - (mat.imag[k] ?? 0);
    }
  return { real, imag, size: mat.size };
}

// Complex scalar * matrix element-wise: (sr + si·i) × each element (mr + mi·i)
export function cMatScalarMul(mat: MatrixItem, sr: number, si: number): MatrixItem {
  const [rows, cols] = sizeToRowsCols(mat.size);
  const real: Matrix = {};
  const imag: Matrix = {};
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const k = `${r}-${c}`;
      const mr = mat.real[k] ?? 0;
      const mi = mat.imag[k] ?? 0;
      real[k] = sr * mr - si * mi;
      imag[k] = sr * mi + si * mr;
    }
  return { real, imag, size: mat.size };
}

// Element-wise division of two same-size matrices: C[r,c] = A[r,c] / B[r,c]
// Returns null if sizes differ.
export function cMatElemDiv(a: MatrixItem, b: MatrixItem): MatrixItem | null {
  if (a.size !== b.size) return null;
  const [rows, cols] = sizeToRowsCols(a.size);
  const real: Matrix = {};
  const imag: Matrix = {};
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const k = `${r}-${c}`;
      const ar = a.real[k] ?? 0, ai = a.imag[k] ?? 0;
      const br = b.real[k] ?? 0, bi = b.imag[k] ?? 0;
      const denom = br * br + bi * bi;
      if (denom === 0) { real[k] = NaN; imag[k] = 0; }
      else { real[k] = (ar * br + ai * bi) / denom; imag[k] = (ai * br - ar * bi) / denom; }
    }
  return { real, imag, size: a.size };
}

// Complex matrix multiplication: C[r,c] = Σ_k A[r,k] × B[k,c]  (complex ×)
export function cMatMul(a: MatrixItem, b: MatrixItem): MatrixItem | null {
  const [aRows, aCols] = sizeToRowsCols(a.size);
  const [bRows, bCols] = sizeToRowsCols(b.size);
  if (aCols !== bRows) return null;
  const real: Matrix = {};
  const imag: Matrix = {};
  for (let r = 0; r < aRows; r++)
    for (let c = 0; c < bCols; c++) {
      let rSum = 0, iSum = 0;
      for (let k = 0; k < aCols; k++) {
        const ar = a.real[`${r}-${k}`] ?? 0, ai = a.imag[`${r}-${k}`] ?? 0;
        const br = b.real[`${k}-${c}`] ?? 0, bi = b.imag[`${k}-${c}`] ?? 0;
        rSum += ar * br - ai * bi;
        iSum += ar * bi + ai * br;
      }
      real[`${r}-${c}`] = rSum;
      imag[`${r}-${c}`] = iSum;
    }
  return { real, imag, size: `${aRows}x${bCols}` };
}
