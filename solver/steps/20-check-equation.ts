import type { SolveContext, StepFn } from "../types";

// Step 20: Check_Equation (eqSolverOld.js)
// After all substitutions, verifies the equation is in a solvable state.
// Stops the pipeline early if there are pre-existing errors.
export const checkEquation: StepFn = async (ctx: SolveContext): Promise<SolveContext> => {
  // If earlier steps already found errors, don't add noise
  if (ctx.errors.length > 0) return ctx;

  const { tokens } = ctx;

  // Must have at least one token to solve
  if (tokens.length === 0) {
    return { ...ctx, errors: [...ctx.errors, "Solve1: Empty equation after substitution."] };
  }

  return ctx;
};
