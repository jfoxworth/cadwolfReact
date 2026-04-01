import type { SolveContext, StepFn } from "../types";

// Operator precedence (higher = tighter binding)
const PRECEDENCE: Record<string, number> = {
  "+": 1, "-": 1,
  "*": 2, "/": 2,
  "^": 3,
};

function isOperator(tok: string): boolean {
  return tok in PRECEDENCE;
}

// Step 25: Convert_To_Post (eqSolverOld.js)
// Converts the token array from infix to postfix (Reverse Polish Notation)
// using the Shunting-yard algorithm.
// Unit tokens (keyArray[i] === 1) are stripped out before conversion —
// they are used only for unit tracking, not for numeric computation.
export const convertToPost: StepFn = async (ctx: SolveContext): Promise<SolveContext> => {
  if (ctx.errors.length > 0) return ctx;

  const { tokens, keyArray } = ctx;

  // Strip unit tokens — keep only numeric / operator tokens
  const mathTokens = tokens.filter((_, i) => keyArray[i] !== 1);

  const output: string[]    = [];
  const opStack: string[]   = [];

  for (const tok of mathTokens) {
    if (tok === "") continue;

    // Number: strict decimal/scientific-notation — must start with digit or leading minus+digit
    const isNum  = /^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+\-]?\d+)?$/.test(tok);
    const isWrap = /^\(-?(?:\d+\.?\d*|\.\d+)(?:[eE][+\-]?\d+)?\)$/.test(tok);
    if (isNum || isWrap) {
      output.push(tok);
      continue;
    }

    // Function call — will be handled as a single unit (not yet implemented for builtins)
    if (tok === "(") {
      opStack.push("(");
      continue;
    }

    if (tok === ")") {
      while (opStack.length > 0 && opStack[opStack.length - 1] !== "(") {
        output.push(opStack.pop()!);
      }
      opStack.pop(); // discard "("
      continue;
    }

    if (isOperator(tok)) {
      const prec = PRECEDENCE[tok];
      while (
        opStack.length > 0 &&
        opStack[opStack.length - 1] !== "(" &&
        isOperator(opStack[opStack.length - 1]) &&
        (PRECEDENCE[opStack[opStack.length - 1]] > prec ||
          (PRECEDENCE[opStack[opStack.length - 1]] === prec && tok !== "^"))
      ) {
        output.push(opStack.pop()!);
      }
      opStack.push(tok);
      continue;
    }

    // Anything else (comma, semi-colon, unresolved token) — pass through
    output.push(tok);
  }

  while (opStack.length > 0) {
    output.push(opStack.pop()!);
  }

  // Store the postfix token list in workingString (space-joined) for step 26
  return { ...ctx, workingString: output.join(" ") };
};
