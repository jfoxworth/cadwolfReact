import type { BuiltinFn, Matrix, SolveContext } from "../../types";
import { evaluateWith, type UnitInfo } from "./eval-with";

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
  xUnit?: UnitInfo,
): Promise<Matrix> {
  const evalAt = (x: number) => evaluateWith(rawExpr, "incsearch", ctx, [{ name: "x", value: x, unit: xUnit }]);

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
