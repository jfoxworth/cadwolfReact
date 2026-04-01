import type { SolveContext, StepFn } from "../types";

// Step 34: Models
// Builds 4 parallel display strings from the original RHS equation by
// substituting variable names with their resolved values, units, dimensions,
// and physical quantity types.
//
// For  F = m * a  with m=5 kg, a=9.81 m/s²:
//   numericalModel:   "(5) * (9.81)"
//   unitsModel:       "(kg) * (m/s^2)"
//   dimensionsModel:  "(1x1) * (1x1)"
//   quantitiesModel:  "(Mass) * (Acceleration)"
//
// These strings are stored in ctx.display and returned to the main thread so
// the UI can display the full substituted expression alongside the result.
export const models: StepFn = async (ctx: SolveContext): Promise<SolveContext> => {
  // Use the original RHS (before function-call preprocessing if any)
  const rawEq = ctx.displayRaw ?? ctx.rawEquation;
  const eqIdx = rawEq.indexOf("=");
  if (eqIdx < 0) return ctx;

  const rhs = rawEq.slice(eqIdx + 1).trim();

  const { documentEquations, currentBlockOrder } = ctx;
  const available = documentEquations
    .filter((eq) => eq.order < currentBlockOrder && eq.solution !== null)
    .sort((a, b) => b.order - a.order);

  let numModel   = rhs;
  let unitsModel = rhs;
  let dimModel   = rhs;
  let quantModel = rhs;

  // Replace each resolved variable in the RHS with its value/units/dim/quantity.
  // Sort by descending name length to avoid partial replacements (e.g. "m_A" before "m").
  const sorted = [...available].sort(
    (a, b) => b.variableName.length - a.variableName.length,
  );

  for (const eq of sorted) {
    if (!eq.solution) continue;
    const name = eq.variableName;
    // Use word-boundary regex so "m" doesn't match inside "m_A"
    const re = new RegExp(`\\b${escapeVarName(name)}\\b`, "g");

    const val = (eq.solution.real["0-0"] ?? 0) * eq.solution.multiplier;
    const numStr   = formatNum(val);
    const unitStr  = eq.solution.units  || "NA";
    const dimStr   = eq.solution.size   || "1x1";
    const quantStr = eq.solution.quantity || "NA";

    numModel   = numModel.replace(re,   `(${numStr})`);
    unitsModel = unitsModel.replace(re, `(${unitStr})`);
    dimModel   = dimModel.replace(re,   `(${dimStr})`);
    quantModel = quantModel.replace(re, `(${quantStr})`);
  }

  return {
    ...ctx,
    display: {
      ...ctx.display,
      numericalModel:   numModel,
      unitsModel:       unitsModel,
      dimensionsModel:  dimModel,
      quantitiesModel:  quantModel,
    },
  };
};

function escapeVarName(name: string): string {
  return name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatNum(val: number): string {
  if (!isFinite(val)) return String(val);
  // Show up to 6 significant figures, strip trailing zeros
  return parseFloat(val.toPrecision(6)).toString();
}
