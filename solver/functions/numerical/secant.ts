import type { BuiltinFn, Matrix, SolveContext } from "../../types";
import { evaluateWith, type UnitInfo } from "./eval-with";

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
  xUnit?: UnitInfo,
): Promise<Matrix> {
  const evalAt = (x: number) => evaluateWith(rawExpr, "secant", ctx, [{ name: "x", value: x, unit: xUnit }]);

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
