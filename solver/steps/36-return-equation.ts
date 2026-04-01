import type { SolveContext, StepFn } from "../types";

// Step 36: Return_Equation (eqSolverOld.js)
// Final step — no-op in the new architecture.
// The result is already in ctx.solution and ctx.display.
// The caller (document-solver.ts) reads these directly.
export const returnEquation: StepFn = async (ctx: SolveContext): Promise<SolveContext> => {
  return ctx;
};
