import type { SolveContext, StepFn, UnitBaseArray } from "../types";
import {
  isMatrixToken, isImagToken, IMAG_TOKEN_PREFIX,
  decodeMatrix, MatrixItem,
  cMatAdd, cMatSub, cMatScalarAdd, cMatScalarSub, cMatScalarMul, cMatMul, cMatElemDiv,
} from "./matrix-utils";

// ─── Stack types ─────────────────────────────────────────────────────────────

interface ScalarComplex { real: number; imag: number }
type StackItem = ScalarComplex | MatrixItem;

function isMat(item: StackItem): item is MatrixItem {
  return "size" in item;
}

function scalarC(real: number, imag = 0): ScalarComplex {
  return { real, imag };
}

function parseNum(tok: string): number {
  const unwrapped = tok.replace(/^\((-?.+)\)$/, "$1");
  return parseFloat(unwrapped.replace(/,/g, ""));
}

// ─── Unit propagation helpers ─────────────────────────────────────────────────

const ZERO_UNITS = [0, 0, 0, 0, 0, 0, 0, 0];

function getBaseArray(item: StackItem): number[] | undefined {
  return isMat(item) ? (item as MatrixItem).baseArray : undefined;
}

/** Attach a unit baseArray to any StackItem. ScalarComplex is promoted to 1×1 MatrixItem. */
function attachBaseArray(item: StackItem, ba: number[]): MatrixItem {
  if (isMat(item)) return { ...(item as MatrixItem), baseArray: ba };
  const sc = item as ScalarComplex;
  return { real: { "0-0": sc.real }, imag: { "0-0": sc.imag }, size: "1x1", baseArray: ba };
}

function mulUnits(ua: number[], ub: number[]): number[] { return ua.map((v, i) => v + ub[i]); }
function divUnits(ua: number[], ub: number[]): number[] { return ua.map((v, i) => v - ub[i]); }
function powUnits(ua: number[], exp: number):  number[] { return ua.map((v) => v * exp); }

// ─── Complex scalar arithmetic ───────────────────────────────────────────────

function cAdd(a: ScalarComplex, b: ScalarComplex): ScalarComplex {
  return { real: a.real + b.real, imag: a.imag + b.imag };
}
function cSub(a: ScalarComplex, b: ScalarComplex): ScalarComplex {
  return { real: a.real - b.real, imag: a.imag - b.imag };
}
function cMul(a: ScalarComplex, b: ScalarComplex): ScalarComplex {
  return {
    real: a.real * b.real - a.imag * b.imag,
    imag: a.real * b.imag + a.imag * b.real,
  };
}
function cDiv(a: ScalarComplex, b: ScalarComplex): ScalarComplex | null {
  const denom = b.real * b.real + b.imag * b.imag;
  if (denom === 0) return null;
  return {
    real: (a.real * b.real + a.imag * b.imag) / denom,
    imag: (a.imag * b.real - a.real * b.imag) / denom,
  };
}

// ─── Step 26: Solve_Postfix ───────────────────────────────────────────────────
// Evaluates the postfix (RPN) expression in ctx.workingString.
// Every MATRIX token may carry a baseArray (SI unit exponents) embedded by steps 10/16.
// Units are propagated through each operation:
//   *   → add exponents        (kg * m/s → kg·m/s)
//   /   → subtract exponents   (kg·m/s / kg → m/s)
//   +/- → keep units           (compatible units required; checked in step 16)
//   ^   → multiply exponents   (m^2 ^ 0.5 → m)
export const solvePostfix: StepFn = async (ctx: SolveContext): Promise<SolveContext> => {
  if (ctx.errors.length > 0) return ctx;

  const postfixTokens = ctx.workingString.split(" ").filter((t) => t !== "");
  const stack: StackItem[] = [];

  for (const tok of postfixTokens) {

    // ── IMAG::N → complex scalar (0 + N·i) ──────────────────────────────────
    if (isImagToken(tok)) {
      const n = parseFloat(tok.slice(IMAG_TOKEN_PREFIX.length));
      stack.push(scalarC(0, isNaN(n) ? 1 : n));
      continue;
    }

    // ── MATRIX token ─────────────────────────────────────────────────────────
    if (isMatrixToken(tok)) {
      const mat = decodeMatrix(tok);
      if (!mat) return { ...ctx, errors: [...ctx.errors, "Solve3: Cannot decode matrix token."] };
      stack.push(mat);
      continue;
    }

    // ── Operators ────────────────────────────────────────────────────────────
    if (tok === "+") {
      const b = stack.pop()!, a = stack.pop()!;
      let result: StackItem;
      if (!isMat(a) && !isMat(b)) {
        result = cAdd(a as ScalarComplex, b as ScalarComplex);
      } else if (isMat(a) && isMat(b)) {
        // Broadcast 1×1 matrix as scalar so that e.g. `vector + scalar_var` works element-wise
        const aMat = a as MatrixItem, bMat = b as MatrixItem;
        if (bMat.size === "1x1") result = cMatScalarAdd(aMat, bMat.real["0-0"] ?? 0, bMat.imag["0-0"] ?? 0);
        else if (aMat.size === "1x1") result = cMatScalarAdd(bMat, aMat.real["0-0"] ?? 0, aMat.imag["0-0"] ?? 0);
        else result = cMatAdd(aMat, bMat);
      } else if (isMat(a) && !isMat(b)) {
        result = cMatScalarAdd(a, (b as ScalarComplex).real, (b as ScalarComplex).imag);
      } else {
        result = cMatScalarAdd(b as MatrixItem, (a as ScalarComplex).real, (a as ScalarComplex).imag);
      }
      // Unit compatibility check: both operands must have compatible dimensions
      const aAddBa = getBaseArray(a);
      const bAddBa = getBaseArray(b);
      const aHasUnits = aAddBa?.some((v) => v !== 0) ?? false;
      const bHasUnits = bAddBa?.some((v) => v !== 0) ?? false;
      if (aHasUnits && bHasUnits && !aAddBa!.every((v, i) => v === bAddBa![i])) {
        return { ...ctx, errors: [...ctx.errors, "Cannot add/subtract values with incompatible units"] };
      }
      if (aHasUnits !== bHasUnits) {
        return { ...ctx, errors: [...ctx.errors, "Cannot add/subtract values with different units (mix of dimensioned and dimensionless)"] };
      }
      const addUnitBa = aAddBa ?? bAddBa;
      if (addUnitBa) result = attachBaseArray(result, addUnitBa);
      stack.push(result);

    } else if (tok === "-") {
      const b = stack.pop()!, a = stack.pop()!;
      let result: StackItem;
      if (!isMat(a) && !isMat(b)) {
        result = cSub(a as ScalarComplex, b as ScalarComplex);
      } else if (isMat(a) && isMat(b)) {
        // Broadcast 1×1 matrix as scalar so that e.g. `vector - scalar_var` works element-wise
        const aMat = a as MatrixItem, bMat = b as MatrixItem;
        if (bMat.size === "1x1") result = cMatScalarAdd(aMat, -(bMat.real["0-0"] ?? 0), -(bMat.imag["0-0"] ?? 0));
        else if (aMat.size === "1x1") result = cMatScalarSub({ real: aMat.real["0-0"] ?? 0, imag: aMat.imag["0-0"] ?? 0 }, bMat);
        else result = cMatSub(aMat, bMat);
      } else if (isMat(a) && !isMat(b)) {
        result = cMatScalarAdd(a, -(b as ScalarComplex).real, -(b as ScalarComplex).imag);
      } else {
        result = cMatScalarSub(a as ScalarComplex, b as MatrixItem);
      }
      // Unit compatibility check (same as addition)
      const aSubBa = getBaseArray(a);
      const bSubBa = getBaseArray(b);
      const aSubHas = aSubBa?.some((v) => v !== 0) ?? false;
      const bSubHas = bSubBa?.some((v) => v !== 0) ?? false;
      if (aSubHas && bSubHas && !aSubBa!.every((v, i) => v === bSubBa![i])) {
        return { ...ctx, errors: [...ctx.errors, "Cannot add/subtract values with incompatible units"] };
      }
      if (aSubHas !== bSubHas) {
        return { ...ctx, errors: [...ctx.errors, "Cannot add/subtract values with different units (mix of dimensioned and dimensionless)"] };
      }
      const subUnitBa = aSubBa ?? bSubBa;
      if (subUnitBa) result = attachBaseArray(result, subUnitBa);
      stack.push(result);

    } else if (tok === "*") {
      const b = stack.pop()!, a = stack.pop()!;
      let result: StackItem;
      if (!isMat(a) && !isMat(b)) {
        result = cMul(a as ScalarComplex, b as ScalarComplex);
      } else if (!isMat(a) && isMat(b)) {
        result = cMatScalarMul(b, (a as ScalarComplex).real, (a as ScalarComplex).imag);
      } else if (isMat(a) && !isMat(b)) {
        result = cMatScalarMul(a, (b as ScalarComplex).real, (b as ScalarComplex).imag);
      } else {
        // Broadcast 1×1 matrix as scalar so that e.g. `vector * scalar_var` works element-wise
        const aMat = a as MatrixItem, bMat = b as MatrixItem;
        if (bMat.size === "1x1") result = cMatScalarMul(aMat, bMat.real["0-0"] ?? 0, bMat.imag["0-0"] ?? 0);
        else if (aMat.size === "1x1") result = cMatScalarMul(bMat, aMat.real["0-0"] ?? 0, aMat.imag["0-0"] ?? 0);
        else {
          const product = cMatMul(aMat, bMat);
          if (!product) return { ...ctx, errors: [...ctx.errors, "Solve5: Matrix dimension mismatch for *."] };
          result = product;
        }
      }
      // Multiplication: add unit exponents
      const mua = getBaseArray(a) ?? ZERO_UNITS;
      const mub = getBaseArray(b) ?? ZERO_UNITS;
      if (mua.some((v) => v !== 0) || mub.some((v) => v !== 0)) {
        result = attachBaseArray(result, mulUnits(mua, mub));
      }
      stack.push(result);

    } else if (tok === "/") {
      const b = stack.pop()!, a = stack.pop()!;
      let result: StackItem;
      if (!isMat(a) && !isMat(b)) {
        const r = cDiv(a as ScalarComplex, b as ScalarComplex);
        if (!r) return { ...ctx, errors: [...ctx.errors, "Solve2: Division by zero."] };
        result = r;
      } else if (isMat(a) && !isMat(b)) {
        const sc = b as ScalarComplex;
        const denom = sc.real * sc.real + sc.imag * sc.imag;
        if (denom === 0) return { ...ctx, errors: [...ctx.errors, "Solve2: Division by zero."] };
        result = cMatScalarMul(a, sc.real / denom, -sc.imag / denom);
      } else if (!isMat(a) && isMat(b) && (b as MatrixItem).size === "1x1") {
        // scalar / 1×1 matrix — treat denominator as scalar
        const bMat = b as MatrixItem;
        const bReal = bMat.real["0-0"] ?? 0;
        const bImag = bMat.imag["0-0"] ?? 0;
        const denom = bReal * bReal + bImag * bImag;
        if (denom === 0) return { ...ctx, errors: [...ctx.errors, "Solve2: Division by zero."] };
        const sc = a as ScalarComplex;
        result = scalarC(
          (sc.real * bReal + sc.imag * bImag) / denom,
          (sc.imag * bReal - sc.real * bImag) / denom,
        );
      } else if (isMat(a) && isMat(b) && (b as MatrixItem).size === "1x1") {
        // matrix / 1×1 matrix — treat denominator as scalar
        const bMat = b as MatrixItem;
        const bReal = bMat.real["0-0"] ?? 0;
        const bImag = bMat.imag["0-0"] ?? 0;
        const denom = bReal * bReal + bImag * bImag;
        if (denom === 0) return { ...ctx, errors: [...ctx.errors, "Solve2: Division by zero."] };
        result = cMatScalarMul(a as MatrixItem, bReal / denom, -bImag / denom);
      } else if (isMat(a) && isMat(b)) {
        // Same-size matrices: element-wise division
        const elemResult = cMatElemDiv(a as MatrixItem, b as MatrixItem);
        if (!elemResult) return { ...ctx, errors: [...ctx.errors, "Solve5: Cannot divide matrices of different sizes."] };
        result = elemResult;
      } else {
        return { ...ctx, errors: [...ctx.errors, "Solve5: Cannot divide by a matrix."] };
      }
      // Division: subtract unit exponents
      const dua = getBaseArray(a) ?? ZERO_UNITS;
      const dub = getBaseArray(b) ?? ZERO_UNITS;
      if (dua.some((v) => v !== 0) || dub.some((v) => v !== 0)) {
        result = attachBaseArray(result, divUnits(dua, dub));
      }
      stack.push(result);

    } else if (tok === "^") {
      const b = stack.pop()!, a = stack.pop()!;
      let result: StackItem;
      if (!isMat(a) && !isMat(b)) {
        const ac = a as ScalarComplex, bc = b as ScalarComplex;
        if (ac.imag === 0 && bc.imag === 0) {
          result = scalarC(Math.pow(ac.real, bc.real));
        } else {
          const r   = Math.sqrt(ac.real * ac.real + ac.imag * ac.imag);
          const th  = Math.atan2(ac.imag, ac.real);
          const lnR = Math.log(r);
          const expR = bc.real * lnR - bc.imag * th;
          const expI = bc.real * th  + bc.imag * lnR;
          const mag  = Math.exp(expR);
          result = scalarC(mag * Math.cos(expI), mag * Math.sin(expI));
        }
      } else if (isMat(a) && !isMat(b)) {
        const bc  = b as ScalarComplex;
        const exp = bc.real;
        const realOut: Record<string, number> = {};
        const imagOut: Record<string, number> = {};
        for (const key of Object.keys(a.real)) {
          const re = a.real[key] ?? 0;
          const im = (a.imag[key] ?? 0);
          if (im === 0 && bc.imag === 0) {
            realOut[key] = Math.pow(re, exp);
            imagOut[key] = 0;
          } else {
            const r2   = Math.sqrt(re * re + im * im);
            const th2  = Math.atan2(im, re);
            const lnR2 = Math.log(r2);
            const expR2 = bc.real * lnR2 - bc.imag * th2;
            const expI2 = bc.real * th2  + bc.imag * lnR2;
            const mag2  = Math.exp(expR2);
            realOut[key] = mag2 * Math.cos(expI2);
            imagOut[key] = mag2 * Math.sin(expI2);
          }
        }
        result = { real: realOut, imag: imagOut, size: a.size };
      } else {
        return { ...ctx, errors: [...ctx.errors, "Solve5: Power operator not supported for this operand combination."] };
      }
      // Power: multiply unit exponents by the scalar exponent
      const pua = getBaseArray(a);
      if (pua && !isMat(b)) {
        result = attachBaseArray(result, powUnits(pua, (b as ScalarComplex).real));
      }
      stack.push(result);

    } else {
      // ── Numeric literal (dimensionless) ───────────────────────────────────
      const n = parseNum(tok);
      if (isNaN(n)) {
        return { ...ctx, errors: [...ctx.errors, `Solve3: Cannot parse token '${tok}' as a number.`] };
      }
      stack.push(scalarC(n));
    }
  }

  if (stack.length !== 1) {
    return { ...ctx, errors: [...ctx.errors, `Solve4: Postfix stack has ${stack.length} values (expected 1).`] };
  }

  const top = stack[0];
  let solution: typeof ctx.solution;
  if (isMat(top)) {
    const mat = top as MatrixItem;
    // For 1×1 scalar-with-units results, use the numeric value as quantity string
    const quantity = (mat.size === "1x1" && mat.baseArray)
      ? String(mat.real["0-0"] ?? 0)
      : mat.size;
    solution = {
      ...ctx.solution,
      real:     mat.real,
      imag:     mat.imag,
      size:     mat.size,
      quantity,
      // Propagated unit from postfix evaluation overwrites any earlier guess
      ...(mat.baseArray?.some((v) => v !== 0) && { baseUnits: mat.baseArray as UnitBaseArray }),
    };
  } else {
    const sc = top as ScalarComplex;
    solution = {
      ...ctx.solution,
      real:     { "0-0": sc.real },
      imag:     { "0-0": sc.imag },
      size:     "1x1",
      quantity: sc.real.toString(),
    };
  }

  return { ...ctx, solution };
};
