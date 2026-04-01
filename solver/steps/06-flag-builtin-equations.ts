import type { SolveContext, StepFn } from "../types";
import { BUILTIN_FUNCTIONS } from "../functions/index";

// Step 06: Flag_BuiltInEquations (eqSolverOld.js lines 817-851)
// Identifies built-in function calls in the token array and merges each
// function name + its parenthesised arguments into a single composite token
// of the form "functionName(args)" so that step 07 can evaluate it atomically.
//
// Example: ["sin", "(", "3.14", ")"] → ["sin(3.14)"]
export const flagBuiltinEquations: StepFn = async (ctx: SolveContext): Promise<SolveContext> => {
  const tokens   = [...ctx.tokens];
  const keyArray = [...ctx.keyArray];

  let i = 0;
  while (i < tokens.length) {
    const tok = tokens[i];
    if (!BUILTIN_FUNCTIONS.has(tok.toLowerCase())) { i++; continue; }
    // Normalise the token to the canonical lowercase key so step 07 can find it
    tokens[i] = tok.toLowerCase();

    // Found a built-in function name. Merge it with its argument list.
    let merged = tok;
    let j = i + 1;
    let depth = 0;
    let found = false;

    while (j < tokens.length) {
      merged += tokens[j];
      if (tokens[j] === "(") depth++;
      if (tokens[j] === ")") {
        depth--;
        if (depth === 0) { found = true; j++; break; }
      }
      j++;
    }

    if (found) {
      // Replace the function-name token and all its argument tokens with the merged token
      tokens.splice(i, j - i, merged);
      keyArray.splice(i, j - i, 0); // single non-unit token
    } else {
      i++;
    }
  }

  return { ...ctx, tokens, keyArray };
};
