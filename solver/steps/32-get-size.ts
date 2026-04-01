import type { SolveContext, StepFn } from "../types";

// Step 32: Get_Size (eqSolverOld.js)
// Determines the size string (e.g. "1x1", "3x1") of the solution matrix.
export const getSize: StepFn = async (ctx: SolveContext): Promise<SolveContext> => {
  if (ctx.errors.length > 0) return ctx;

  const keys  = Object.keys(ctx.solution.real);
  if (keys.length === 0) {
    return { ...ctx, solution: { ...ctx.solution, size: "1x1" } };
  }

  let maxRow = 0, maxCol = 0;
  for (const key of keys) {
    const parts = key.split("-").map(Number);
    if (parts[0] > maxRow) maxRow = parts[0];
    if (parts[1] > maxCol) maxCol = parts[1];
  }

  return {
    ...ctx,
    solution: { ...ctx.solution, size: `${maxRow + 1}x${maxCol + 1}` },
  };
};
