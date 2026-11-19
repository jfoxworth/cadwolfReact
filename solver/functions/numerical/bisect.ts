import type { BuiltinFn, Matrix, SolveContext } from "../../types";
import { evaluateWith, type UnitInfo } from "./eval-with";

// bisect(f(x), xl, xu, es?, maxit?)
// Bisection root-finding on f(x) = 0 over [xl, xu].
//   args[0] = pre-evaluated f(xl) from pipeline (not used directly — see step 07)
//   args[1] = xl — lower bound
//   args[2] = xu — upper bound
//   args[3] = es — stopping criterion (default 0.001)
//   args[4] = maxit — maximum iterations (default 50)
//
// NOTE: this function is called via the special-case path in step 07 which passes
// the raw expression string as args[0] is unused; the actual implementation is
// bisectImpl() below, called directly from step 07.
//
// Returns a 1×3 row vector: [root, approximate_error, iterations]
export const bisect: BuiltinFn = async (_args, _ctx) => {
  return { "0-0": 0, "0-1": 0, "0-2": 0 };
};

// Core implementation — called from step 07 special handling.
export async function bisectImpl(
  rawExpr: string,
  xl: number,
  xu: number,
  es: number,
  maxit: number,
  ctx: SolveContext,
  xUnit?: UnitInfo,
): Promise<Matrix> {
  const evalAt = (x: number) => evaluateWith(rawExpr, "bisect", ctx, [{ name: "x", value: x, unit: xUnit }]);

  let xr = xu;
  let xrOld = xr;
  let ea = 100;
  let iter = 0;

  for (iter = 0; iter < maxit; iter++) {
    xrOld = xr;
    xr = (xl + xu) / 2;
    const fxl = await evalAt(xl);
    const fxr = await evalAt(xr);
    if (xr !== 0) ea = Math.abs((xr - xrOld) / xr) * 100;
    if (ea < es || Math.abs(fxr) < 1e-14) break;
    if (fxl * fxr < 0) xu = xr;
    else xl = xr;
  }

  return { "0-0": xr, "0-1": ea, "0-2": iter + 1 };
}
