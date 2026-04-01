import type { SolveContext, StepFn, Matrix, UnitBaseArray } from "../types";
import { BUILTIN_FUNCTIONS } from "../functions/index";
import { encodeMatrix } from "./matrix-utils";
import { bisectImpl } from "../functions/numerical/bisect";
import { secantImpl } from "../functions/numerical/secant";
import { falsePosImpl } from "../functions/numerical/false-pos";
import { incSearchImpl } from "../functions/numerical/inc-search";
import { ode4Impl } from "../functions/numerical/ode4";
import { termsToUnitString } from "../units/parse-compound";

// SI base-unit dimension names (index matches UnitBaseArray position)
const BASE_UNIT_NAMES = ["A", "K", "s", "m", "kg", "cd", "mol", "rad"] as const;

// Build a compound unit string (e.g. "m/s") from an 8-element base-unit exponent array.
function baseArrayToUnitString(base: number[]): string {
  const terms = BASE_UNIT_NAMES
    .map((name, i) => ({ symbol: name, power: base[i] ?? 0 }))
    .filter((t) => t.power !== 0);
  return termsToUnitString(terms);
}

// Encode a Matrix function result as the appropriate token string.
function encodeResult(realResult: Matrix, imagResult: Matrix = {}): string {
  const resultKeys = Object.keys(realResult);
  const imagKeys   = Object.keys(imagResult);
  if (resultKeys.length <= 1 && imagKeys.every((k) => imagResult[k] === 0)) {
    return (realResult["0-0"] ?? 0).toString();
  }
  if (resultKeys.length <= 1) {
    return encodeMatrix({ "0-0": realResult["0-0"] ?? 0 }, "1x1", { "0-0": imagResult["0-0"] ?? 0 });
  }
  let maxRow = 0, maxCol = 0;
  for (const key of resultKeys) {
    const [r, c] = key.split("-").map(Number);
    if (r > maxRow) maxRow = r;
    if (c > maxCol) maxCol = c;
  }
  return encodeMatrix(realResult, `${maxRow + 1}x${maxCol + 1}`, imagKeys.length ? imagResult : undefined);
}

// Parse "functionName(arg1,arg2,...)" into [name, [arg1, arg2, ...]]
function parseFunctionToken(tok: string): { name: string; rawArgs: string[] } | null {
  const parenIdx = tok.indexOf("(");
  if (parenIdx < 0) return null;
  const name = tok.slice(0, parenIdx).toLowerCase();
  if (!BUILTIN_FUNCTIONS.has(name)) return null;
  const inner = tok.slice(parenIdx + 1, tok.lastIndexOf(")"));
  // Split on top-level commas only
  const rawArgs: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of inner) {
    if (ch === "(" || ch === "[") depth++;
    if (ch === ")" || ch === "]") depth--;
    if (ch === "," && depth === 0) { rawArgs.push(current.trim()); current = ""; }
    else current += ch;
  }
  if (current.trim()) rawArgs.push(current.trim());
  return { name, rawArgs };
}

interface ComplexResult { real: Matrix; imag: Matrix; units?: string; baseUnits?: number[]; }

// Solve a raw argument string via the full pipeline, returning both real and imag (plus units).
async function solveArgComplex(rawArg: string, ctx: SolveContext): Promise<ComplexResult> {
  const { runPipeline } = await import("../pipeline");
  const emptyBase: [number,number,number,number,number,number,number,number] = [0,0,0,0,0,0,0,0];
  const subCtx: SolveContext = {
    ...ctx,
    eqId: ctx.eqId + "_inner",
    rawEquation: `_inner_=${rawArg}`,
    workingString: `_inner_=${rawArg}`,
    variableName: "",
    rhsString: "",
    tokens: [],
    keyArray: [],
    variableArray: [],
    postfixArray: [],
    solution: {
      real:       { "0-0": 0 },
      imag:       { "0-0": 0 },
      size:       "1x1",
      units:      "",
      baseUnits:  emptyBase,
      multiplier: 1,
      quantity:   "",
    },
    display: { equation: "", solution: "", numericalModel: "", unitsModel: "", dimensionsModel: "", quantitiesModel: "" },
    errors: [],
  };
  const result = await runPipeline(subCtx);
  if (result.errors.length > 0) {
    const n = parseFloat(rawArg);
    const v = isNaN(n) ? 0 : n;
    return { real: { "0-0": v }, imag: { "0-0": 0 } };
  }

  let units     = result.solution.units || undefined;
  let baseUnits = result.solution.baseUnits ? [...result.solution.baseUnits] : undefined;

  // If the sub-pipeline returned no unit info, check whether the raw arg is a
  // simple variable name whose resolved equation already has unit metadata.
  // This covers the common case where a vector/matrix variable carries units
  // (e.g. y = [0,1,4,9,16] with unit "m") — the unit is on the ResolvedEquation
  // but is not re-injected into the sub-pipeline token stream.
  const noUnits = !baseUnits?.some((v) => v !== 0);
  if (noUnits && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(rawArg.trim())) {
    const varName = rawArg.trim().toLowerCase();
    const varEq = ctx.documentEquations.find(
      (eq) =>
        eq.variableName?.toLowerCase() === varName &&
        (ctx.currentBlockOrder === 0 || (eq.order ?? Infinity) < ctx.currentBlockOrder)
    );
    if (varEq?.solution?.baseUnits?.some((v) => v !== 0)) {
      baseUnits = [...varEq.solution.baseUnits];
      units     = varEq.solution.units || undefined;
    }
  }

  return { real: result.solution.real, imag: result.solution.imag, units, baseUnits };
}

// Infer size string from a Matrix's keys
function inferSize(mat: Matrix): string {
  let maxRow = 0, maxCol = 0;
  for (const key of Object.keys(mat)) {
    const [r, c] = key.split("-").map(Number);
    if (r > maxRow) maxRow = r;
    if (c > maxCol) maxCol = c;
  }
  return `${maxRow + 1}x${maxCol + 1}`;
}

// Step 07: Remove_BuiltInEquations (eqSolverOld.js lines 861-877)
// Evaluates merged function tokens like "sin(3.14)" by calling the
// corresponding BuiltinFn and replacing the token with the numeric result.
// Each argument is solved via runPipeline so units are properly converted.
// Special cases:
//   real(z)  → real part of z
//   imag(z)  → imaginary part of z
//   conj(z)  → z with negated imaginary part
//   floor/ceil(expr, unit) → second arg resolved as unit conv_factor
//   bisect(f(x), xl, xu, es?, maxit?)    → root-finding; rawArgs[0] evaluated with sub-pipeline
//   secant(f(x), x1, x2, es?, maxit?)    → root-finding; rawArgs[0] evaluated with sub-pipeline
//   falsepos(f(x), xl, xu, es?, maxit?)  → root-finding; rawArgs[0] evaluated with sub-pipeline
//   incsearch(f(x), xmin, xmax, ns?)     → bracket search; rawArgs[0] evaluated with sub-pipeline
//   ode4(x_vector, y0, expr)             → RK4 integration; rawArgs[2] evaluated at each step with x and y injected
//   fourier(data)                         → complex DFT; encodes both real and imag parts
export const removeBuiltinEquations: StepFn = async (ctx: SolveContext): Promise<SolveContext> => {
  const tokens   = [...ctx.tokens];
  const keyArray = [...ctx.keyArray];
  const errors   = [...ctx.errors];
  // Set when a calculus function propagates derived units to the output solution.
  let derivedSolution: typeof ctx.solution | undefined;

  for (let i = 0; i < tokens.length; i++) {
    const parsed = parseFunctionToken(tokens[i]);
    if (!parsed) continue;

    const fn = BUILTIN_FUNCTIONS.get(parsed.name)!;

    try {
      // Evaluate all args, capturing both real and imag parts
      const complexArgs: ComplexResult[] = await Promise.all(
        parsed.rawArgs.map((a) => solveArgComplex(a, ctx))
      );

      // ── Special case: real(z) → real part ───────────────────────────────
      if (parsed.name === "real") {
        const r = complexArgs[0]?.real ?? { "0-0": 0 };
        const size = inferSize(r);
        tokens[i] = encodeMatrix(r, size.includes("x") ? size : "1x1");
        keyArray[i] = 0;
        continue;
      }

      // ── Special case: imag(z) → imaginary part ───────────────────────────
      if (parsed.name === "imag") {
        const im = complexArgs[0]?.imag ?? { "0-0": 0 };
        const size = inferSize(im);
        tokens[i] = encodeMatrix(im, Object.keys(im).length > 0 ? size : "1x1");
        keyArray[i] = 0;
        continue;
      }

      // ── Special case: bisect(f(x), xl, xu, es?, maxit?) ─────────────────
      // The function expression (rawArgs[0]) must NOT be pre-evaluated;
      // bisectImpl evaluates it with different x values via sub-pipelines.
      if (parsed.name === "bisect") {
        const xl    = complexArgs[1]?.real["0-0"] ?? 0;
        const xu    = complexArgs[2]?.real["0-0"] ?? 1;
        const es    = parsed.rawArgs.length > 3 ? (complexArgs[3]?.real["0-0"] ?? 0.001) : 0.001;
        const maxit = parsed.rawArgs.length > 4 ? Math.round(complexArgs[4]?.real["0-0"] ?? 50) : 50;
        const res = await bisectImpl(parsed.rawArgs[0], xl, xu, es, maxit, ctx);
        const size = `1x${Object.keys(res).length}`;
        tokens[i] = encodeMatrix(res, size);
        keyArray[i] = 0;
        continue;
      }

      // ── Special case: secant(f(x), x1, x2, es?, maxit?) ─────────────────
      if (parsed.name === "secant") {
        const x1    = complexArgs[1]?.real["0-0"] ?? 0;
        const x2    = complexArgs[2]?.real["0-0"] ?? 1;
        const es    = parsed.rawArgs.length > 3 ? (complexArgs[3]?.real["0-0"] ?? 0.0001) : 0.0001;
        const maxit = parsed.rawArgs.length > 4 ? Math.round(complexArgs[4]?.real["0-0"] ?? 50) : 50;
        const res = await secantImpl(parsed.rawArgs[0], x1, x2, es, maxit, ctx);
        const size = `1x${Object.keys(res).length}`;
        tokens[i] = encodeMatrix(res, size);
        keyArray[i] = 0;
        continue;
      }

      // ── Special case: falsepos(f(x), xl, xu, es?, maxit?) ───────────────
      if (parsed.name === "falsepos") {
        const xl    = complexArgs[1]?.real["0-0"] ?? 0;
        const xu    = complexArgs[2]?.real["0-0"] ?? 1;
        const es    = parsed.rawArgs.length > 3 ? (complexArgs[3]?.real["0-0"] ?? 0.001) : 0.001;
        const maxit = parsed.rawArgs.length > 4 ? Math.round(complexArgs[4]?.real["0-0"] ?? 50) : 50;
        const res = await falsePosImpl(parsed.rawArgs[0], xl, xu, es, maxit, ctx);
        const size = `1x${Object.keys(res).length}`;
        tokens[i] = encodeMatrix(res, size);
        keyArray[i] = 0;
        continue;
      }

      // ── Special case: incsearch(f(x), xmin, xmax, ns?) ──────────────────
      if (parsed.name === "incsearch") {
        const xmin = complexArgs[1]?.real["0-0"] ?? 0;
        const xmax = complexArgs[2]?.real["0-0"] ?? 1;
        const ns   = parsed.rawArgs.length > 3 ? Math.round(complexArgs[3]?.real["0-0"] ?? 50) : 50;
        const res = await incSearchImpl(parsed.rawArgs[0], xmin, xmax, ns, ctx);
        const keys = Object.keys(res);
        let maxRow = 0, maxCol = 0;
        for (const k of keys) {
          const [r, c] = k.split("-").map(Number);
          if (r > maxRow) maxRow = r;
          if (c > maxCol) maxCol = c;
        }
        const size = keys.length > 1 ? `${maxRow + 1}x${maxCol + 1}` : "1x1";
        tokens[i] = encodeMatrix(res, size);
        keyArray[i] = 0;
        continue;
      }

      // ── Special case: ode4(x, y0, expr) ─────────────────────────────────
      // Matches original Python ODE4(x_vector, y0, derivative_expression).
      // The derivative expression (rawArgs[2]) must NOT be pre-evaluated;
      // ode4Impl re-evaluates it at each step with x and y injected.
      if (parsed.name === "ode4") {
        if (parsed.rawArgs.length < 3) {
          errors.push("ode4: requires 3 arguments — ode4(x_vector, y0, expr)");
          tokens[i] = "0";
          keyArray[i] = 0;
          continue;
        }
        const xMat  = complexArgs[0]?.real ?? { "0-0": 0 };
        const y0Mat = complexArgs[1]?.real ?? { "0-0": 0 };
        const res = await ode4Impl(parsed.rawArgs[2], xMat, y0Mat, ctx);
        const resKeys = Object.keys(res);
        let maxRow = 0, maxCol = 0;
        for (const k of resKeys) {
          const [r, c] = k.split("-").map(Number);
          if (r > maxRow) maxRow = r;
          if (c > maxCol) maxCol = c;
        }
        const size = resKeys.length > 1 ? `${maxRow + 1}x${maxCol + 1}` : "1x1";
        tokens[i] = encodeMatrix(res, size);
        keyArray[i] = 0;
        continue;
      }

      // ── Special case: conj(z) → conjugate (negate imag) ─────────────────
      if (parsed.name === "conj") {
        const { real, imag } = complexArgs[0] ?? { real: { "0-0": 0 }, imag: { "0-0": 0 } };
        const negImag: Matrix = {};
        for (const [k, v] of Object.entries(imag)) negImag[k] = -v;
        const size = inferSize(real);
        tokens[i] = encodeMatrix(real, Object.keys(real).length > 0 ? size : "1x1", negImag);
        keyArray[i] = 0;
        continue;
      }

      // ── Special case: root(n, val) — handle negative radicands as complex ──
      // root(2, -4) → 2i  (even root of negative → imaginary)
      // root(3, -8) → -2  (odd root of negative → negative real)
      // root(n, complex) → uses polar form: r^(1/n) * e^(iθ/n)
      if (parsed.name === "root") {
        const n = complexArgs[0]?.real["0-0"] ?? 2;
        const rVal = complexArgs[1]?.real ?? { "0-0": 0 };
        const iVal = complexArgs[1]?.imag ?? {};
        const realOut: Matrix = {};
        const imagOut: Matrix = {};
        const keys = Object.keys(rVal);
        for (const key of keys) {
          const re = rVal[key] ?? 0;
          const im = iVal[key] ?? 0;
          if (im === 0 && re >= 0) {
            // Positive real: simple nth root
            realOut[key] = Math.pow(re, 1 / n);
            imagOut[key] = 0;
          } else if (im === 0 && Number.isInteger(n) && n % 2 === 1) {
            // Odd root of negative real → negative real
            realOut[key] = -Math.pow(-re, 1 / n);
            imagOut[key] = 0;
          } else {
            // Complex or negative-even: use polar form
            const r = Math.sqrt(re * re + im * im);
            const theta = Math.atan2(im, re);
            const mag = Math.pow(r, 1 / n);
            realOut[key] = mag * Math.cos(theta / n);
            imagOut[key] = mag * Math.sin(theta / n);
          }
        }
        const size = keys.length > 0 ? inferSize(realOut) : "1x1";
        const hasImag = Object.values(imagOut).some((v) => v !== 0);
        tokens[i] = encodeMatrix(realOut, size, hasImag ? imagOut : undefined);
        keyArray[i] = 0;

        // Propagate units: output_units = x_units ^ (1/n)
        const xUnits = complexArgs[1]?.baseUnits;
        if (n !== 0 && xUnits?.some((v) => v !== 0)) {
          const outputBase = xUnits.map((v) => v / n);
          if (outputBase.some((v) => v !== 0)) {
            const unitStr = baseArrayToUnitString(outputBase);
            // Always inject a unit token so add/sub compatibility checks see the unit
            tokens.splice(i + 1, 0, unitStr);
            keyArray.splice(i + 1, 0, 1);
            i++;
            // Record in derivedSolution if this equation had no prior units
            if (!ctx.solution.units) {
              derivedSolution = { ...ctx.solution, units: unitStr, baseUnits: outputBase as UnitBaseArray };
            }
          }
        }
        continue;
      }

      // ── Special case: fourier(data) → complex DFT result ────────────────
      // Returns a complex row vector; imag part computed via fourierImag helper.
      if (parsed.name === "fourier") {
        const dataArg = complexArgs[0]?.real ?? { "0-0": 0 };
        const N = Object.keys(dataArg).length;
        const realOut: Matrix = {};
        const imagOut: Matrix = {};
        for (let k = 0; k < N; k++) {
          const vals: number[] = [];
          for (let b = 0; b < N; b++) vals.push(dataArg[`0-${b}`] ?? dataArg[`${b}-0`] ?? 0);
          let re = 0, im = 0;
          for (let b = 0; b < N; b++) {
            const angle = -2 * Math.PI * k * b / N;
            re += vals[b] * Math.cos(angle);
            im += vals[b] * Math.sin(angle);
          }
          realOut[`0-${k}`] = re;
          imagOut[`0-${k}`] = im;
        }
        const size = N > 0 ? `1x${N}` : "1x1";
        tokens[i] = encodeMatrix(realOut, size, imagOut);
        keyArray[i] = 0;
        continue;
      }

      // ── Special case: gausse(A, b) → propagate units from b (minus units of A) ──
      // output_units = b_units / a_units (base-unit subtraction)
      // We embed the computed base units into the MATRIX token so step 26
      // propagates them correctly and step 27 can find the named unit.
      if (parsed.name === "gausse") {
        const aArg = complexArgs[0] ?? { real: {}, imag: {} };
        const bArg = complexArgs[1] ?? { real: { "0-0": 0 }, imag: { "0-0": 0 } };
        const realResult = await fn([aArg.real, bArg.real], ctx);
        const resultKeys = Object.keys(realResult);
        let maxRow = 0, maxCol = 0;
        for (const key of resultKeys) {
          const [r, c] = key.split("-").map(Number);
          if (r > maxRow) maxRow = r;
          if (c > maxCol) maxCol = c;
        }
        const size = resultKeys.length > 0 ? `${maxRow + 1}x${maxCol + 1}` : "1x1";

        // Compute output base units from argument base units
        const bBase = bArg.baseUnits;
        const aBase = aArg.baseUnits;
        let outputBase: number[] | undefined;
        if (bBase && bBase.some((v) => v !== 0)) {
          if (aBase && aBase.some((v) => v !== 0)) {
            outputBase = bBase.map((b, idx) => b - (aBase[idx] ?? 0));
          } else {
            outputBase = [...bBase];
          }
        }

        tokens[i] = encodeMatrix(realResult, size, undefined, outputBase);
        keyArray[i] = 0;
        continue;
      }

      // ── Special case: derivative(y, h, order, accuracy) ─────────────────
      // Output units = y_units / h_units^order
      if (parsed.name === "derivative") {
        const args: Matrix[] = complexArgs.map((ca) => ca.real);
        const realResult = await fn(args, ctx);
        tokens[i] = encodeResult(realResult);
        keyArray[i] = 0;

        if (!ctx.solution.units) {
          const yBase = complexArgs[0]?.baseUnits ?? [];
          const hBase = complexArgs[1]?.baseUnits ?? [];
          const order = Math.round(complexArgs[2]?.real?.["0-0"] ?? 1);
          const outputBase = Array.from({ length: 8 }, (_, idx) =>
            (yBase[idx] ?? 0) - order * (hBase[idx] ?? 0)
          );
          if (outputBase.some((v) => v !== 0)) {
            const unitStr = baseArrayToUnitString(outputBase);
            derivedSolution = { ...ctx.solution, units: unitStr };
          }
        }
        continue;
      }

      // ── Special case: derivativeun(xdata, ydata, newxdata) ──────────────
      // Output units = y_units / x_units  (first-order Lagrange derivative)
      if (parsed.name === "derivativeun") {
        const args: Matrix[] = complexArgs.map((ca) => ca.real);
        const realResult = await fn(args, ctx);
        tokens[i] = encodeResult(realResult);
        keyArray[i] = 0;

        if (!ctx.solution.units) {
          const xBase = complexArgs[0]?.baseUnits ?? [];
          const yBase = complexArgs[1]?.baseUnits ?? [];
          const outputBase = Array.from({ length: 8 }, (_, idx) =>
            (yBase[idx] ?? 0) - (xBase[idx] ?? 0)
          );
          if (outputBase.some((v) => v !== 0)) {
            const unitStr = baseArrayToUnitString(outputBase);
            derivedSolution = { ...ctx.solution, units: unitStr };
          }
        }
        continue;
      }

      // ── Special case: integrate(xdata, ydata) ────────────────────────────
      // Output units = x_units * y_units
      if (parsed.name === "integrate") {
        const args: Matrix[] = complexArgs.map((ca) => ca.real);
        const realResult = await fn(args, ctx);
        tokens[i] = encodeResult(realResult);
        keyArray[i] = 0;

        if (!ctx.solution.units) {
          const xBase = complexArgs[0]?.baseUnits ?? [];
          const yBase = complexArgs[1]?.baseUnits ?? [];
          const outputBase = Array.from({ length: 8 }, (_, idx) =>
            (xBase[idx] ?? 0) + (yBase[idx] ?? 0)
          );
          if (outputBase.some((v) => v !== 0)) {
            const unitStr = baseArrayToUnitString(outputBase);
            derivedSolution = { ...ctx.solution, units: unitStr };
          }
        }
        continue;
      }

      // ── Special case: power(exp, base) ──────────────────────────────────────
      // Output units = base_units ^ exp
      // e.g. power(2, 3m) → 9 m^2
      if (parsed.name === "power") {
        const args: Matrix[] = complexArgs.map((ca) => ca.real);
        const realResult = await fn(args, ctx);
        tokens[i] = encodeResult(realResult);
        keyArray[i] = 0;

        const exp = complexArgs[0]?.real?.["0-0"] ?? 1; // args[0] = exponent
        const argBase = complexArgs[1]?.baseUnits;      // args[1] = base
        if (argBase?.some((v) => v !== 0)) {
          const outputBase = argBase.map((v) => v * exp);
          if (outputBase.some((v) => v !== 0)) {
            const unitStr = baseArrayToUnitString(outputBase);
            // Always inject a unit token so add/sub compatibility checks see the unit
            tokens.splice(i + 1, 0, unitStr);
            keyArray.splice(i + 1, 0, 1);
            i++;
            // Record in derivedSolution if this equation had no prior units
            if (!ctx.solution.units) {
              derivedSolution = { ...ctx.solution, units: unitStr, baseUnits: outputBase as UnitBaseArray };
            }
          }
        }
        continue;
      }

      // ── Special case: ifElse(testVal, op, compareVal, trueVal[, falseVal]) ─
      // rawArgs[1] is the operator string ("==", "!=", etc.), not an expression.
      if (parsed.name === "ifelse") {
        if (parsed.rawArgs.length < 4 || parsed.rawArgs.length > 5) {
          errors.push(`IfElse: requires 4 or 5 arguments, got ${parsed.rawArgs.length}`);
          tokens[i] = "0";
          keyArray[i] = 0;
          continue;
        }
        const op = parsed.rawArgs[1].trim();
        const [testResult, compareResult, trueResult] = await Promise.all([
          solveArgComplex(parsed.rawArgs[0], ctx),
          solveArgComplex(parsed.rawArgs[2], ctx),
          solveArgComplex(parsed.rawArgs[3], ctx),
        ]);
        const falseResult = parsed.rawArgs[4] !== undefined
          ? await solveArgComplex(parsed.rawArgs[4], ctx)
          : undefined;
        const { evaluateIfElse } = await import("../functions/utility/if-else");
        const result = evaluateIfElse(
          testResult.real, op, compareResult.real, trueResult.real, falseResult?.real,
        );
        tokens[i] = encodeResult(result);
        keyArray[i] = 0;

        // Propagate units from the selected branch.
        // Re-derive which branch was taken to pick the right unit source.
        const testKeys = Object.keys(testResult.real);
        const cmpKeys  = Object.keys(compareResult.real);
        const normOp   = op.replace(/&lt;=/g,"<=").replace(/&gt;=/g,">=").replace(/&lt;/g,"<").replace(/&gt;/g,">").trim();
        let condTrue = false;
        if (normOp === "==")       condTrue = testKeys.length === cmpKeys.length && testKeys.every(k => testResult.real[k] === compareResult.real[k]);
        else if (normOp === "!=")  condTrue = testKeys.length !== cmpKeys.length || testKeys.some(k => testResult.real[k] !== compareResult.real[k]);
        else if (normOp === ">")   condTrue = testKeys.length > 0 && testKeys.every(k => (testResult.real[k]??0) > (compareResult.real[k]??0));
        else if (normOp === "<")   condTrue = testKeys.length > 0 && testKeys.every(k => (testResult.real[k]??0) < (compareResult.real[k]??0));
        else if (normOp === ">=")  condTrue = testKeys.length > 0 && testKeys.every(k => (testResult.real[k]??0) >= (compareResult.real[k]??0));
        else if (normOp === "<=")  condTrue = testKeys.length > 0 && testKeys.every(k => (testResult.real[k]??0) <= (compareResult.real[k]??0));
        const selectedBranch = (condTrue || falseResult === undefined) ? trueResult : falseResult;
        if (selectedBranch.units) {
          tokens.splice(i + 1, 0, selectedBranch.units);
          keyArray.splice(i + 1, 0, 1);
          i++; // skip the injected unit token
        }
        continue;
      }

      // ── Special case: round(expr, unit) — unit-quantized rounding ──────────
      // If the second arg is a unit name, round to the nearest whole unit:
      //   result_in_SI = conv_factor * Math.round(val_in_SI / conv_factor)
      // e.g. round(10235m, km) → 10235/1000=10.235 → round → 10 → *1000 = 10000m
      if (parsed.name === "round" && parsed.rawArgs.length >= 2) {
        const unitName = parsed.rawArgs[1].trim();
        const { SCALE_UNIT_MAP } = await import("../units/scale-unit-data");
        const entry = SCALE_UNIT_MAP.get(unitName);
        if (entry) {
          const mult = entry.conv_factor;
          const realResult: Matrix = {};
          const imagResult: Matrix = {};
          for (const [key, val] of Object.entries(complexArgs[0]?.real ?? {})) {
            realResult[key] = mult * Math.round(val / mult);
          }
          for (const [key, val] of Object.entries(complexArgs[0]?.imag ?? {})) {
            imagResult[key] = mult * Math.round(val / mult);
          }
          const resultKeys = Object.keys(realResult);
          if (resultKeys.length <= 1 && Object.values(imagResult).every((v) => v === 0)) {
            tokens[i] = (realResult["0-0"] ?? 0).toString();
          } else {
            let maxRow = 0, maxCol = 0;
            for (const key of resultKeys) {
              const [r, c] = key.split("-").map(Number);
              if (r > maxRow) maxRow = r;
              if (c > maxCol) maxCol = c;
            }
            const size = `${maxRow + 1}x${maxCol + 1}`;
            tokens[i] = encodeMatrix(realResult, size, Object.keys(imagResult).length ? imagResult : undefined);
          }
          keyArray[i] = 0;
          // Re-inject the input unit — rounding doesn't change dimension
          const roundUnitStr = complexArgs[0]?.units;
          if (roundUnitStr) {
            tokens.splice(i + 1, 0, roundUnitStr);
            keyArray.splice(i + 1, 0, 1);
            i++;
          }
          continue;
        }
      }

      // ── Standard path: pass real parts as args ───────────────────────────
      const args: Matrix[] = complexArgs.map((ca) => ca.real);

      // floor/ceil: second arg is a unit name, not a numeric expression.
      // Override args[1] with the unit's conv_factor.
      if ((parsed.name === "floor" || parsed.name === "ceil") && parsed.rawArgs.length >= 2) {
        const unitName = parsed.rawArgs[1].trim();
        const { SCALE_UNIT_MAP } = await import("../units/scale-unit-data");
        const entry = SCALE_UNIT_MAP.get(unitName);
        if (entry) {
          args[1] = { "0-0": entry.conv_factor };
        } else {
          throw new Error(`${parsed.name}(): "${unitName}" is not a recognized unit`);
        }
      }

      const realResult = await fn(args, ctx);

      // Apply the same function to the imaginary part for element-wise functions.
      // (floor, ceil, round apply to both; most other functions zero out imag)
      let imagResult: Matrix = {};
      if (parsed.name === "floor" || parsed.name === "ceil" || parsed.name === "round") {
        const imagArgs: Matrix[] = complexArgs.map((ca) => ca.imag);
        if (parsed.name === "floor" || parsed.name === "ceil") {
          // Carry the unit conv_factor arg to imag too (already validated above)
          if (parsed.rawArgs.length >= 2) {
            const unitName = parsed.rawArgs[1].trim();
            const { SCALE_UNIT_MAP } = await import("../units/scale-unit-data");
            const entry = SCALE_UNIT_MAP.get(unitName);
            if (entry) imagArgs[1] = { "0-0": entry.conv_factor };
          }
        }
        imagResult = await fn(imagArgs, ctx);
      }

      // Encode result as complex MATRIX token if result is multi-element,
      // or as a plain number/matrix token for scalar real results.
      const resultKeys = Object.keys(realResult);
      if (resultKeys.length <= 1 && Object.keys(imagResult).every((k) => imagResult[k] === 0)) {
        // Scalar real result
        tokens[i] = (realResult["0-0"] ?? 0).toString();
      } else if (resultKeys.length <= 1) {
        // Scalar complex result
        const rVal = realResult["0-0"] ?? 0;
        const iVal = imagResult["0-0"] ?? 0;
        tokens[i] = encodeMatrix({ "0-0": rVal }, "1x1", { "0-0": iVal });
      } else {
        // Vector/matrix result
        let maxRow = 0, maxCol = 0;
        for (const key of resultKeys) {
          const [r, c] = key.split("-").map(Number);
          if (r > maxRow) maxRow = r;
          if (c > maxCol) maxCol = c;
        }
        const size = `${maxRow + 1}x${maxCol + 1}`;
        tokens[i] = encodeMatrix(realResult, size, Object.keys(imagResult).length ? imagResult : undefined);
      }
      keyArray[i] = 0;

      // floor/ceil/round with a unit arg: re-inject the input unit so downstream
      // equations keep the correct dimension. Rounding never changes the physical unit.
      if ((parsed.name === "floor" || parsed.name === "ceil") && parsed.rawArgs.length >= 2) {
        const { SCALE_UNIT_MAP } = await import("../units/scale-unit-data");
        if (SCALE_UNIT_MAP.has(parsed.rawArgs[1].trim())) {
          const inputUnit = complexArgs[0]?.units;
          if (inputUnit) {
            tokens.splice(i + 1, 0, inputUnit);
            keyArray.splice(i + 1, 0, 1);
            i++;
          }
        }
      }

    } catch (err) {
      errors.push(`Solve5: Error in ${parsed.name}(): ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return {
    ...ctx,
    tokens,
    keyArray,
    errors,
    solution: derivedSolution ?? ctx.solution,
  };
};
