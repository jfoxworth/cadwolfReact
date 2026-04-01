import type { SolveContext, StepFn } from "../types";

// Step 05: Replace_Inputs (eqSolverOld.js lines 1191-1204)
// In the legacy solver, this step checks if the equation was called as a
// sub-equation with input overrides (Solution_Inputs object). If so, it
// replaces matching variable tokens in the variable array with the input values.
//
// This feature depends on DOM_Object / CreateEq (browser-side globals).
// It only runs for equations that were created by step 04 (Parse_Inputs).
//
// Passthrough: when sub-equation support is ported, implement input substitution
// here by checking a ctx.solutionInputs map and substituting accordingly.
export const replaceInputs: StepFn = async (ctx: SolveContext): Promise<SolveContext> => {
  return ctx;
};
