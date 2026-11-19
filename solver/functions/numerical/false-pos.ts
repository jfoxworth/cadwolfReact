import type { BuiltinFn, Matrix, SolveContext } from "../../types";
import { evaluateWith, type UnitInfo } from "./eval-with";

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
  xUnit?: UnitInfo,
): Promise<Matrix> {
  const evalAt = (x: number) => evaluateWith(rawExpr, "falsepos", ctx, [{ name: "x", value: x, unit: xUnit }]);

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
