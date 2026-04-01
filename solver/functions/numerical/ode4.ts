import type { BuiltinFn, Matrix, SolveContext, ResolvedEquation } from "../../types";

/**
 * ode4(x, y0, exprs)
 *
 * Classical 4th-order Runge-Kutta integration matching the original Python ODE4 interface.
 *
 * Arguments
 * ---------
 *   x      pre-computed vector of independent variable values (e.g. linspace(0,10,100))
 *   y0     initial condition(s) as a vector:  [y1_0, y2_0, ...]
 *   exprs  derivative expressions as an array: [dy1/dx_expr, dy2/dx_expr, ...]
 *          Expressions reference state variables as y1, y2, ... and independent
 *          variable as x.
 *
 * Returns
 * -------
 *   Matrix with one row per state variable and one column per x step.
 *   Row 0 = y1 values over time, row 1 = y2 values over time, etc.
 *
 * Example (scalar)
 * ----------------
 *   g    = 9.81
 *   Cd   = 0.25
 *   m    = 68.1
 *   Time = linspace(0, 12, 7)
 *   v    = ode4(Time, [0], [9.81 - .25/68.1 * power(2,y1)])
 *
 * Example (system)
 * ----------------
 *   Jumper = ode4(Time, [0, 0], [y2, 9.81 - .25/68.1 * power(2,y2)])
 *   (y1 = position, y2 = velocity)
 *
 * NOTE: the derivative expressions (3rd arg) are NOT pre-evaluated; step 07 intercepts
 * this function and calls ode4Impl() with the raw expression string.
 */
export const ode4: BuiltinFn = async (_args, _ctx) => {
  // Stub — actual implementation is in ode4Impl(), called from step 07.
  return { "0-0": 0 };
};

/** Split a comma-separated list at the top level (respecting nested parens/brackets). */
function splitTopLevel(s: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of s) {
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

/** Strip one layer of surrounding [ ] or ( ) brackets if present. */
function stripBrackets(s: string): string {
  const t = s.trim();
  if ((t.startsWith("[") && t.endsWith("]")) || (t.startsWith("(") && t.endsWith(")"))) {
    return t.slice(1, -1).trim();
  }
  return t;
}

// Core implementation — called from step 07 special handling.
export async function ode4Impl(
  rawExprStr: string,   // raw expression string, possibly "[expr1, expr2, ...]"
  xMat: Matrix,
  y0Mat: Matrix,
  ctx: SolveContext,
): Promise<Matrix> {
  const { runPipeline } = await import("../../pipeline");
  const emptyBase: [number,number,number,number,number,number,number,number] = [0,0,0,0,0,0,0,0];

  // Parse expression list — strip outer brackets then split by top-level commas
  const exprs = splitTopLevel(stripBrackets(rawExprStr));
  const nStates = exprs.length;

  // Extract ordered x time points from the x matrix
  const xKeys = Object.keys(xMat).sort((a, b) => {
    const [ra, ca] = a.split("-").map(Number);
    const [rb, cb] = b.split("-").map(Number);
    return ra !== rb ? ra - rb : ca - cb;
  });
  const timePoints = xKeys.map((k) => xMat[k]);

  // Extract initial conditions in order
  const y0Keys = Object.keys(y0Mat).sort((a, b) => {
    const [ra, ca] = a.split("-").map(Number);
    const [rb, cb] = b.split("-").map(Number);
    return ra !== rb ? ra - rb : ca - cb;
  });
  const y0Values = y0Keys.map((k) => y0Mat[k]);

  // Pad y0 with zeros if fewer initial conditions than expressions
  const y: number[] = Array.from({ length: nStates }, (_, i) => y0Values[i] ?? 0);

  if (timePoints.length === 0) {
    const result: Matrix = {};
    for (let s = 0; s < nStates; s++) result[`${s}-0`] = y[s];
    return result;
  }

  /**
   * Evaluate all derivative expressions at a given (x, y1, y2, ...) state.
   * Returns an array of derivatives [dy1/dx, dy2/dx, ...].
   */
  async function evalDerivatives(x: number, yState: number[]): Promise<number[]> {
    // Build injected equations: remove any existing y1/y2/x variables, then add current values
    // State variables are y0, y1, y2, ... (zero-indexed, matching Python convention)
    const stateNames = Array.from({ length: nStates }, (_, i) => `y${i}`);
    const baseDoc = ctx.documentEquations.filter(
      (e) =>
        e.variableName.toLowerCase() !== "x" &&
        !stateNames.includes(e.variableName.toLowerCase()),
    );

    const injected: ResolvedEquation[] = [
      ...baseDoc,
      {
        blockId: "_ode4_x_",
        order: -1,
        variableName: "x",
        solution: {
          real: { "0-0": x },
          imag: { "0-0": 0 },
          size: "1x1",
          units: "",
          baseUnits: emptyBase,
          multiplier: 1,
          quantity: "",
        },
        error: null,
      },
      ...stateNames.map((name, i): ResolvedEquation => ({
        blockId: `_ode4_${name}_`,
        order: -1,
        variableName: name,
        solution: {
          real: { "0-0": yState[i] },
          imag: { "0-0": 0 },
          size: "1x1",
          units: "",
          baseUnits: emptyBase,
          multiplier: 1,
          quantity: "",
        },
        error: null,
      })),
    ];

    // Evaluate each expression independently
    return Promise.all(
      exprs.map(async (expr) => {
        const subCtx: SolveContext = {
          ...ctx,
          eqId: `${ctx.eqId}_ode4`,
          rawEquation: `_f_=${expr}`,
          workingString: `_f_=${expr}`,
          variableName: "",
          rhsString: "",
          tokens: [],
          keyArray: [],
          variableArray: [],
          postfixArray: [],
          solution: {
            real: { "0-0": 0 },
            imag: { "0-0": 0 },
            size: "1x1",
            units: "",
            baseUnits: emptyBase,
            multiplier: 1,
            quantity: "",
          },
          display: {
            equation: "",
            solution: "",
            numericalModel: "",
            unitsModel: "",
            dimensionsModel: "",
            quantitiesModel: "",
          },
          errors: [],
          documentEquations: injected,
        };
        const r = await runPipeline(subCtx);
        return (r.solution.real["0-0"] ?? 0) * r.solution.multiplier;
      }),
    );
  }

  // RK4 loop — result[stateIdx][timeIdx] stored as "stateIdx-timeIdx"
  const result: Matrix = {};

  for (let i = 0; i < timePoints.length; i++) {
    const x = timePoints[i];

    // Record current state
    for (let s = 0; s < nStates; s++) {
      result[`${s}-${i}`] = y[s];
    }

    if (i < timePoints.length - 1) {
      const dx = timePoints[i + 1] - x;

      const k1 = await evalDerivatives(x,          [...y]);
      const y2  = y.map((yi, s) => yi + (dx / 2) * k1[s]);
      const k2 = await evalDerivatives(x + dx / 2, y2);
      const y3  = y.map((yi, s) => yi + (dx / 2) * k2[s]);
      const k3 = await evalDerivatives(x + dx / 2, y3);
      const y4  = y.map((yi, s) => yi + dx * k3[s]);
      const k4 = await evalDerivatives(x + dx,     y4);

      for (let s = 0; s < nStates; s++) {
        y[s] = y[s] + (dx / 6) * (k1[s] + 2 * k2[s] + 2 * k3[s] + k4[s]);
      }
    }
  }

  return result;
}
