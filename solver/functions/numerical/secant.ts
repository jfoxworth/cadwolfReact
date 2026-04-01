import type { BuiltinFn, Matrix, SolveContext } from "../../types";

// secant(f(x), x1, x2, es?, maxit?)
// Secant method root-finding on f(x) = 0 starting from two initial guesses.
//   args[0] = pre-evaluated (not used — see bisect.ts note)
//   args[1] = x1 — first initial guess
//   args[2] = x2 — second initial guess
//   args[3] = es — stopping criterion (default 0.0001)
//   args[4] = maxit — maximum iterations (default 50)
//
// Returns a 1×3 row vector: [root, approximate_error, iterations]
export const secant: BuiltinFn = async (_args, _ctx) => {
  return { "0-0": 0, "0-1": 0, "0-2": 0 };
};

// Core implementation — called from step 07 special handling.
export async function secantImpl(
  rawExpr: string,
  x1: number,
  x2: number,
  es: number,
  maxit: number,
  ctx: SolveContext,
): Promise<Matrix> {
  const { runPipeline } = await import("../../pipeline");
  const emptyBase: [number,number,number,number,number,number,number,number] = [0,0,0,0,0,0,0,0];

  async function evalAt(x: number): Promise<number> {
    const subCtx: SolveContext = {
      ...ctx,
      eqId: `${ctx.eqId}_secant`,
      rawEquation: `_f_=${rawExpr}`,
      workingString: `_f_=${rawExpr}`,
      variableName: "", rhsString: "",
      tokens: [], keyArray: [], variableArray: [], postfixArray: [],
      solution: { real: {"0-0":0}, imag: {"0-0":0}, size:"1x1", units:"", baseUnits:emptyBase, multiplier:1, quantity:"" },
      display: { equation: "", solution: "", numericalModel: "", unitsModel: "", dimensionsModel: "", quantitiesModel: "" },
      errors: [],
      documentEquations: [
        ...ctx.documentEquations.filter((e) => e.variableName.toLowerCase() !== "x"),
        {
          blockId: "_secant_x_",
          order: -1,
          variableName: "x",
          solution: { real: {"0-0": x}, imag: {"0-0":0}, size:"1x1", units:"", baseUnits:emptyBase, multiplier:1, quantity:"" },
          error: null,
        },
      ],
    };
    const r = await runPipeline(subCtx);
    return (r.solution.real["0-0"] ?? 0) * r.solution.multiplier;
  }

  let y1 = await evalAt(x1);
  let ea = 100;
  let iter = 0;

  for (iter = 0; iter < maxit; iter++) {
    const y2 = await evalAt(x2);
    const denom = y2 - y1;
    if (Math.abs(denom) < 1e-14) break;
    const xNew = x2 - y2 * (x2 - x1) / denom;
    if (xNew !== 0) ea = Math.abs((xNew - x2) / xNew) * 100;
    if (ea < es || Math.abs(y2) < 1e-14) { x2 = xNew; break; }
    x1 = x2; y1 = y2;
    x2 = xNew;
  }

  return { "0-0": x2, "0-1": ea, "0-2": iter + 1 };
}
