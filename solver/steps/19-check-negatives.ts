import type { SolveContext, StepFn } from "../types";

// Step 19: Check_Negatives (eqSolverOld.js lines 2250-2301)
// Looks for standalone "-" tokens and normalises them to avoid operator
// ambiguity in the postfix evaluator:
//   - "-" at the start of an expression → replace with "-1", insert "*"
//   - "-" after an operator/open-paren → replace with "-1", insert "*"
//   - "+" followed by "-" → remove the "+"
//   - "-" before "(" (at start or after another "(") → replace with "-1", insert "*"
//
// In the legacy code these cases replace the "-" with an equation-object whose
// real["0-0"] = -1.  In the TypeScript pipeline, we simply replace the token
// with the literal string "-1" and insert a "*" operator, which the postfix
// converter handles correctly.
export const checkNegatives: StepFn = async (ctx: SolveContext): Promise<SolveContext> => {
  const tokens  = [...ctx.tokens];
  const keyArray = [...ctx.keyArray];

  const OPERATORS = new Set(["+", "-", "//", "*", "(", "[", "#"]);

  for (let index = 0; index < tokens.length; ++index) {
    const v1 = tokens[index];
    const v2 = tokens[index + 1];
    const v3 = index > 0 ? tokens[index - 1] : "#";

    // A token is a "resolved value" if it looks like a number (not an operator)
    function isValue(t: string | undefined): boolean {
      if (t === undefined) return false;
      // MATRIX tokens (encoded by steps 10/16) are resolved values
      if (t.startsWith("MATRIX::")) return true;
      return /^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+\-]?\d+)?$/.test(t) ||
             /^\(-?(?:\d+\.?\d*|\.\d+)(?:[eE][+\-]?\d+)?\)$/.test(t);
    }

    // Case 1: negative at the beginning (before a value token)
    if (v1 === "-" && isValue(v2) && index === 0) {
      tokens[index] = "-1";
      tokens.splice(index + 1, 0, "*");
      keyArray.splice(index + 1, 0, 0);

    // Case 2: negative after an operator/paren (before a value token)
    } else if (v1 === "-" && isValue(v2) && OPERATORS.has(v3)) {
      tokens[index] = "-1";
      tokens.splice(index + 1, 0, "*");
      keyArray.splice(index + 1, 0, 0);

    // Case 3: "+" followed by "-" → remove the "+"
    } else if (v1 === "-" && v3 === "+") {
      tokens.splice(index - 1, 1);
      keyArray.splice(index - 1, 1);

    // Case 4: "-" before "(" at the beginning or after another "("
    } else if (
      v1 === "-" && v2 === "(" &&
      (index === 0 || v3 === "(")
    ) {
      tokens[index] = "-1";
      tokens.splice(index + 1, 0, "*");
      keyArray.splice(index + 1, 0, 0);
    }
  }

  return { ...ctx, tokens, keyArray };
};
