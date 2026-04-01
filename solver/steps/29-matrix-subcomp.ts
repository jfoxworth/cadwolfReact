import type { SolveContext, StepFn } from "../types";

// Step 29: Matrix_SubComp
// Handles matrix element assignment on the LHS: "M[0,1] = 5"
// Detects when ctx.variableName contains "[i,j]", finds the base matrix M in
// documentEquations, clones it, sets the indexed element to the RHS scalar
// result, and returns the full updated matrix as the solution.
//
// This runs AFTER step 26 (postfix evaluation) which has already computed the
// RHS scalar into ctx.solution.
export const matrixSubcomp: StepFn = async (ctx: SolveContext): Promise<SolveContext> => {
  const varName = ctx.variableName;

  // Check for LHS indexing: variable name like M[0,1] or M[2]
  const bracketIdx = varName.indexOf("[");
  if (bracketIdx < 0) return ctx;

  const baseName  = varName.slice(0, bracketIdx).trim();
  const indexExpr = varName.slice(bracketIdx + 1, varName.lastIndexOf("]")).trim();

  if (!baseName || !indexExpr) return ctx;

  // Parse indices — support "i,j" (row,col) or "j" (single index)
  const parts = indexExpr.split(",").map((s) => parseInt(s.trim(), 10));
  if (parts.some(isNaN)) return ctx;

  const rowIdx = parts.length >= 2 ? parts[0] : 0;
  const colIdx = parts.length >= 2 ? parts[1] : parts[0];

  // Find the base matrix in documentEquations
  const { documentEquations, currentBlockOrder } = ctx;
  const available = documentEquations
    .filter((eq) => eq.order < currentBlockOrder && eq.solution !== null)
    .sort((a, b) => b.order - a.order);

  const baseEq = available.find(
    (eq) => eq.variableName.toLowerCase() === baseName.toLowerCase(),
  );

  if (!baseEq?.solution) {
    // Base matrix not found — treat as new 1x1 assignment
    return { ...ctx, variableName: baseName };
  }

  // Clone the real and imag matrices
  const newReal = { ...baseEq.solution.real };
  const newImag = { ...baseEq.solution.imag };

  const key = `${rowIdx}-${colIdx}`;
  const rhsVal = (ctx.solution.real["0-0"] ?? 0) * ctx.solution.multiplier;
  newReal[key] = rhsVal;
  if (newImag[key] !== undefined) delete newImag[key];

  // Parse existing size and expand if needed
  const [rows, cols] = baseEq.solution.size.split("x").map(Number);
  const newRows = Math.max(rows, rowIdx + 1);
  const newCols = Math.max(cols, colIdx + 1);
  const newSize = `${newRows}x${newCols}`;

  return {
    ...ctx,
    variableName: baseName,   // strip the [i,j] so downstream sees just "M"
    solution: {
      ...ctx.solution,
      real:      newReal,
      imag:      newImag,
      size:      newSize,
      units:     baseEq.solution.units,
      baseUnits: baseEq.solution.baseUnits,
      multiplier: 1,
    },
  };
};
