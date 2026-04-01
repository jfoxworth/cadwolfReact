import type { SolveContext, StepFn, Matrix } from "../types";
import { SCALE_UNIT_MAP } from "../units/scale-unit-data";
import { parseCompound, termsToUnitString } from "../units/parse-compound";

// Step 22: Scale_Units
// For each token in the unit string, look it up in scaleUnits.json.
// Accumulate the total multiplicative conversion factor and replace each
// token with its canonical SI unit (conv_unit). Then scale solution.real/imag.
// Temperature units (C, F, R) are handled as offset conversions.
export const scaleUnits: StepFn = async (ctx: SolveContext): Promise<SolveContext> => {
  if (ctx.errors.length > 0 || !ctx.solution.units) return ctx;

  const terms = parseCompound(ctx.solution.units);
  if (terms.length === 0) return ctx;

  // ── Temperature: single-unit offset conversion ──────────────────────────
  const sym = terms[0].symbol;
  if (terms.length === 1 && (sym === "C" || sym === "F" || sym === "R")) {
    const val = ctx.solution.real["0-0"] ?? 0;
    let converted: number;
    if (sym === "C")      converted = val + 273.15;
    else if (sym === "F") converted = (val + 459.67) * (5 / 9);
    else                  converted = val * (5 / 9);  // R
    return {
      ...ctx,
      solution: { ...ctx.solution, real: { ...ctx.solution.real, "0-0": converted }, units: "K" },
    };
  }

  // ── General: multiplicative conversion ──────────────────────────────────
  let multiplier = 1;
  const canonicalTerms: { symbol: string; power: number }[] = [];

  for (const { symbol, power } of terms) {
    const entry = SCALE_UNIT_MAP.get(symbol);
    if (!entry) {
      canonicalTerms.push({ symbol, power });
      continue;
    }
    multiplier *= Math.pow(entry.conv_factor, power);
    canonicalTerms.push({ symbol: entry.conv_unit, power });
  }

  const real: Matrix = {};
  for (const [key, val] of Object.entries(ctx.solution.real)) {
    real[key] = val * multiplier;
  }

  const imag: Matrix = {};
  for (const [key, val] of Object.entries(ctx.solution.imag)) {
    imag[key] = val * multiplier;
  }

  return {
    ...ctx,
    solution: {
      ...ctx.solution,
      real,
      imag,
      // Use the freshly-computed multiplier directly. Step 21 may have already set
      // ctx.solution.multiplier, but step 22 recomputes from the unit string, so we
      // do not accumulate to avoid double-applying the conversion factor.
      multiplier: multiplier,
      units: termsToUnitString(canonicalTerms),
    },
  };
};
