import type { SolveContext, StepFn } from "../types";

// Step 24: Get_Base_String (eqSolverOld.js lines 2689-2716)
// Builds a compact string from the base-unit exponent array.
// Used for unit compatibility checks when combining quantities.
// e.g. [0,0,-2,1,1,0,0,0] → "00-211000" (N: kg*m/s^2)
export const getBaseString: StepFn = async (ctx: SolveContext): Promise<SolveContext> => {
  const { solution } = ctx;
  const baseString = solution.baseUnits.join("");
  // Store as quantity description on solution for display purposes
  return {
    ...ctx,
    solution: { ...solution, quantity: baseString },
  };
};
