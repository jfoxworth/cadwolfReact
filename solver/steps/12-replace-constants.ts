import type { SolveContext, StepFn } from "../types";

// Step 12: Replace_Constants (eqSolverOld.js)
// Replaces named constants (pi, e, g, …) in the token array with their numeric values.
export const replaceConstants: StepFn = async (ctx: SolveContext): Promise<SolveContext> => {
  const tokens   = [...ctx.tokens];
  const keyArray = [...ctx.keyArray];
  const { constants } = ctx;

  for (let i = 0; i < tokens.length; i++) {
    const bare     = tokens[i].replace(/^-/, "");
    const negative = tokens[i] !== bare;

    const constant = constants.get(bare);
    if (!constant) continue;

    const numeric = constant.value * constant.multiplier;
    tokens[i]   = negative ? `(-${numeric})` : numeric.toString();
    keyArray[i] = 0; // reset — was a name possibly flagged as unit prefix by step 03

    // Insert unit token if the constant has units
    if (constant.units) {
      tokens.splice(i + 1, 0, constant.units);
      keyArray.splice(i + 1, 0, 1);
      i++;
    }
  }

  return { ...ctx, tokens, keyArray };
};
