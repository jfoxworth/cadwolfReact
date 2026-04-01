import type { SolveContext, StepFn } from "../types";
import { encodeMatrix } from "./matrix-utils";

// Step 10: Replace_Variables
// Replaces variable name tokens with MATRIX tokens that carry both the numeric
// value and the unit baseArray. Embedding units in the token (rather than
// inserting a separate unit token) allows step 26 to propagate units correctly
// through compound expressions like (m_A*v_A + m_B*v_B)/(m_A+m_B).
export const replaceVariables: StepFn = async (ctx: SolveContext): Promise<SolveContext> => {
  const tokens   = [...ctx.tokens];
  const keyArray = [...ctx.keyArray];
  const { documentEquations, currentBlockOrder } = ctx;

  const available = documentEquations
    .filter((eq) => eq.order < currentBlockOrder && eq.solution !== null)
    .sort((a, b) => b.order - a.order);

  for (let i = 0; i < tokens.length; i++) {
    const bare = tokens[i].replace(/^-/, "");
    const negative = tokens[i].startsWith("-") && bare !== tokens[i];

    const match = available.find((eq) => eq.variableName.toLowerCase() === bare.toLowerCase());
    if (!match || !match.solution) continue;

    const sol = match.solution;
    const hasImag = sol.imag && Object.values(sol.imag).some((v) => v !== 0);
    const baseArray = sol.baseUnits?.some((v) => v !== 0) ? Array.from(sol.baseUnits) : undefined;

    if (sol.size === "1x1" && !hasImag) {
      // Scalar real — embed as MATRIX token with unit baseArray.
      const val = (sol.real["0-0"] ?? 0) * sol.multiplier;
      tokens[i]   = encodeMatrix({ "0-0": negative ? -val : val }, "1x1", {}, baseArray);
      keyArray[i] = 0;
    } else {
      // Matrix or complex scalar — embed with unit baseArray.
      if (negative) {
        const negReal: Record<string, number> = {};
        const negImag: Record<string, number> = {};
        for (const k of Object.keys(sol.real)) negReal[k] = -(sol.real[k] ?? 0);
        if (sol.imag) for (const k of Object.keys(sol.imag)) negImag[k] = -(sol.imag[k] ?? 0);
        tokens[i] = encodeMatrix(negReal, sol.size, negImag, baseArray);
      } else {
        tokens[i] = encodeMatrix(sol.real, sol.size, sol.imag ?? {}, baseArray);
      }
      keyArray[i] = 0;
    }
  }

  return { ...ctx, tokens, keyArray };
};
