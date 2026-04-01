import type { SolveContext, StepFn } from "../types";

// Step 08: Remove_SubEquations (eqSolverOld.js lines 889-923)
// In the legacy solver, this step scans the variable array for tokens whose
// name matches a previously-defined equation name AND is immediately followed
// by a "(" token. When found, it creates a new temporary equation object that
// solves that equation with overridden inputs and replaces the call with the
// result ID.
//
// Example: if "Force = m * a" was defined earlier, then "Force(a=9.81)" in
// the current equation calls it with a=9.81.
//
// This feature depends on DOM_Object and CreateEq (browser-side globals).
// In the TypeScript pipeline, step 10 (replaceVariables) already handles the
// simple "variable reference" case. Sub-equation calls with inputs are handled
// by step 04 (parseInputs). This step is not needed for the basic pipeline.
//
// Passthrough.
export const removeSubEquations: StepFn = async (ctx: SolveContext): Promise<SolveContext> => {
  return ctx;
};
