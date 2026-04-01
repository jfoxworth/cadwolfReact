import type { BuiltinFn, Matrix, SolveContext } from "../../types";

// falsePos(f(x), xl, xu, es?, maxit?)
// False-position (regula falsi) root-finding on f(x) = 0 over [xl, xu].
// Returns a 1×3 row vector: [root, approximate_error%, iterations]
export const falsePos: BuiltinFn = async (_args, _ctx) => {
  return { "0-0": 0, "0-1": 0, "0-2": 0 };
};

// Core implementation — called from step 07 special handling.
export async function falsePosImpl(
  rawExpr: string,
  xl: number,
  xu: number,
  es: number,
  maxit: number,
  ctx: SolveContext,
): Promise<Matrix> {
  const { runPipeline } = await import("../../pipeline");
  const emptyBase: [number,number,number,number,number,number,number,number] = [0,0,0,0,0,0,0,0];

  async function evalAt(x: number): Promise<number> {
    const subCtx: SolveContext = {
      ...ctx,
      eqId: `${ctx.eqId}_falsepos`,
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
          blockId: "_falsepos_x_",
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

  let fl = await evalAt(xl);
  let fu = await evalAt(xu);
  let xr = xu;
  let xrOld = xr;
  let ea = 100;
  let iter = 0;

  for (iter = 0; iter < maxit; iter++) {
    xrOld = xr;
    const sub = xl - xu;
    xr = sub !== 0 ? xu - (fu * sub) / (fl - fu) : 0;
    const fr = await evalAt(xr);

    if (xr !== 0) ea = Math.abs((xr - xrOld) / xr) * 100;
    if (ea < es || Math.abs(fr) < 1e-14) break;

    if (fl * fr < 0) {
      xu = xr; fu = fr;
    } else if (fl * fr === 0) {
      ea = 0; break;
    } else {
      xl = xr; fl = fr;
    }
  }

  return { "0-0": xr, "0-1": ea, "0-2": iter + 1 };
}
