import type { SolveContext, StepFn } from "../types";
import { rawToLatex } from "../../utils/rawToLatex";

function formatNumber(n: number): string {
  if (!isFinite(n)) return n.toString();
  return parseFloat(n.toPrecision(6)).toString();
}

function formatMatrix(real: Record<string, number>, size: string, multiplier = 1): string {
  const [rowsStr, colsStr] = size.split("x");
  const rows = parseInt(rowsStr, 10);
  const cols = parseInt(colsStr, 10);

  const rowStrings: string[] = [];
  for (let r = 0; r < rows; r++) {
    const cells: string[] = [];
    for (let c = 0; c < cols; c++) {
      cells.push(formatNumber((real[`${r}-${c}`] ?? 0) * multiplier));
    }
    rowStrings.push(cells.join(" & "));
  }

  return `\\begin{bmatrix}${rowStrings.join(" \\\\ ")}\\end{bmatrix}`;
}

// Step 33: Show_Solution
// Builds the LaTeX string for just the numeric result + units.
//
// Auto-display thresholds:
//   - Vectors (1 row or 1 col): show full matrix if total elements ≤ 10
//   - True matrices:            show full matrix if total elements ≤ 100
//   - Beyond threshold:         show size only, e.g. \text{[12x5]}
//
// `matrixSize` is always set in display for non-scalar results so the
// equation block can apply a user-level show/hide override.
function autoShowMatrix(size: string): boolean {
  const [rows, cols] = size.split("x").map(Number);
  const total = rows * cols;
  const isVector = rows === 1 || cols === 1;
  return isVector ? total <= 10 : total <= 100;
}

export const showSolution: StepFn = async (ctx: SolveContext): Promise<SolveContext> => {
  if (ctx.errors.length > 0) return ctx;

  const hasImag = ctx.solution.imag && Object.values(ctx.solution.imag).some((v) => v !== 0);

  let solution: string;
  let matrixSize: string | undefined;

  if (ctx.solution.size !== "1x1") {
    matrixSize = ctx.solution.size;

    const matMultiplier = ctx.solution.multiplier;
    const matUnits = ctx.solution.units ? ` \\, ${rawToLatex(ctx.solution.units)}` : "";

    solution = formatMatrix(ctx.solution.real, ctx.solution.size);
    if (hasImag) {
      solution += ` + ${formatMatrix(ctx.solution.imag, ctx.solution.size)}i`;
    }
    solution += matUnits;
  } else {
    // solution.multiplier holds the conversion factor from the input unit to the SI
    // canonical unit (set by step 22). Always apply it so the displayed value and unit
    // are both in consistent SI base units (e.g. 0.002 in → 0.0000508 m).
    const multiplier = ctx.solution.multiplier;
    const rVal  = (ctx.solution.real["0-0"] ?? 0) * multiplier;
    const iVal  = hasImag ? (ctx.solution.imag["0-0"] ?? 0) * multiplier : 0;
    const units = ctx.solution.units ? ` \\, ${rawToLatex(ctx.solution.units)}` : "";

    if (iVal === 0) {
      solution = `${formatNumber(rVal)}${units}`;
    } else if (rVal === 0) {
      solution = `${formatNumber(iVal)}i${units}`;
    } else if (iVal < 0) {
      solution = `${formatNumber(rVal)} - ${formatNumber(-iVal)}i${units}`;
    } else {
      solution = `${formatNumber(rVal)} + ${formatNumber(iVal)}i${units}`;
    }
  }

  return {
    ...ctx,
    display: { ...ctx.display, solution, matrixSize },
  };
};
