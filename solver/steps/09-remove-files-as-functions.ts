import type { SolveContext, StepFn } from "../types";

// Step 09: Remove_FilesAsFunctions (eqSolverOld.js lines 935-965)
// In the legacy solver, this step scans the variable array for calls to
// "files used as functions" — documents imported as named functions. When found,
// it extracts the input arguments, solves each equation in the imported file
// with those inputs, and replaces the call with the output value.
//
// This feature depends on the ImportedFunctions global array (browser-side) and
// requires a full recursive document-solve for the imported file.
//
// In the TypeScript pipeline, ctx.importedFunctions holds the ImportedFunction[]
// data. When porting this step:
//   1. Scan tokens for token[i-1] matching an ImportedFunction name and token[i] === "("
//   2. Extract input expressions up to the matching ")"
//   3. Solve each imported file's equations with substituted inputs via runPipeline
//   4. Replace the call token with the output value
//
// Passthrough for now.
export const removeFilesAsFunctions: StepFn = async (ctx: SolveContext): Promise<SolveContext> => {
  return ctx;
};
