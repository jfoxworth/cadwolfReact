import type { BuiltinFn, Matrix, SolveContext } from "../../types";

// incSearch(f(x), xmin, xmax, ns?)
// Incremental search: evaluates f at ns+1 equally-spaced points over [xmin, xmax],
// returns bracket pairs [xl, xu] where sign changes occur.
//   args[0] = f(x) — function expression (raw, handled by step 07)
//   args[1] = xmin — lower bound
//   args[2] = xmax — upper bound
//   args[3] = ns   — number of steps (default 50)
//
// Returns an N×2 matrix: each row is [xl, xu] for one sign-change bracket.
// Returns {0-0: 0} if no brackets are found.
export const incSearch: BuiltinFn = async (_args, _ctx) => {
  return { "0-0": 0 };
};

// Core implementation — called from step 07 special handling.
export async function incSearchImpl(
  rawExpr: string,
  xmin: number,
  xmax: number,
  ns: number,
  ctx: SolveContext,
): Promise<Matrix> {
  const { runPipeline } = await import("../../pipeline");
  const emptyBase: [number,number,number,number,number,number,number,number] = [0,0,0,0,0,0,0,0];

  async function evalAt(x: number): Promise<number> {
    const subCtx: SolveContext = {
      ...ctx,
      eqId: `${ctx.eqId}_incsearch`,
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
          blockId: "_incsearch_x_",
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

  const xdiff = (xmax - xmin) / ns;
  const result: Matrix = {};
  let count = 0;

  // Evaluate f at all ns+1 points
  const fVals: number[] = [];
  for (let i = 0; i <= ns; i++) fVals.push(await evalAt(xmin + i * xdiff));

  // Find sign changes
  for (let i = 0; i < ns; i++) {
    if ((fVals[i] > 0 && fVals[i + 1] < 0) || (fVals[i] < 0 && fVals[i + 1] > 0)) {
      result[`${count}-0`] = xmin + i * xdiff;
      result[`${count}-1`] = xmin + (i + 1) * xdiff;
      count++;
    }
  }

  if (count === 0) return { "0-0": 0 };
  return result;
}
