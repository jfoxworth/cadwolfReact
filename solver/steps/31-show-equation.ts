import type { SolveContext, StepFn } from "../types";
import { rawToLatex } from "../../utils/rawToLatex";

// Step 31: Show_Equation (eqSolverOld.js)
// Builds the LaTeX display string for the equation side (LHS = RHS).
export const showEquation: StepFn = async (ctx: SolveContext): Promise<SolveContext> => {
  if (ctx.errors.length > 0) return ctx;

  // Use displayRaw (original equation before function-call substitution) when available.
  const equation = rawToLatex(ctx.displayRaw ?? ctx.rawEquation);

  return {
    ...ctx,
    display: { ...ctx.display, equation },
  };
};
