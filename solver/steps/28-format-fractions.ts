import type { SolveContext, StepFn } from "../types";

// Step 28: Format_Fractions
// Converts unit strings like "m/s^2" to LaTeX fraction notation "\frac{m}{s^2}".
// Operates on ctx.solution.units (already computed by step 27).
// Only applies when the unit string contains a "/" (fraction needed).
export const formatFractions: StepFn = async (ctx: SolveContext): Promise<SolveContext> => {
  const units = ctx.solution.units;
  if (!units || !units.includes("/")) return ctx;

  const formatted = unitStringToLatexFraction(units);
  return {
    ...ctx,
    solution: { ...ctx.solution, units: formatted },
  };
};

function unitStringToLatexFraction(units: string): string {
  // Split on "/" but be careful with exponents like m^2/s^3
  // Strategy: split into numerator and denominator parts
  const slashIdx = units.indexOf("/");
  if (slashIdx < 0) return units;

  const numerator   = units.slice(0, slashIdx).trim();
  const denominator = units.slice(slashIdx + 1).trim();

  if (!numerator || !denominator) return units;

  // Wrap compound numerators/denominators in braces
  const numPart = numerator.includes("*") ? `{${numerator}}` : `{${numerator}}`;
  const denPart = denominator.includes("*") ? `{${denominator}}` : `{${denominator}}`;

  return `\\frac${numPart}${denPart}`;
}
