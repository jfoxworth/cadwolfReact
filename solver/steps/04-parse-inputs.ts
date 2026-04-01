import type { SolveContext, StepFn } from "../types";

// Step 04: Parse_Inputs (eqSolverOld.js lines 1127-1168)
// In the legacy solver, this step finds any "equation-called-with-inputs"
// patterns like "Force(a=9.81)" in the variable array, creates a sub-equation
// object with those input overrides, and replaces the call with the result.
//
// This feature depends on DOM_Object and CreateEq (browser-side globals) which
// are not available in the TypeScript pipeline. Sub-equation calls require a
// full recursive solve which is not yet supported here.
//
// Passthrough: when this feature is ported, implement the sub-equation solver
// using ctx.documentEquations and a recursive runPipeline call.
export const parseInputs: StepFn = async (ctx: SolveContext): Promise<SolveContext> => {
  return ctx;
};
