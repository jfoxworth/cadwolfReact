import type { SolveContext, StepFn } from "../types";
import { SCALE_UNIT_MAP } from "../units/scale-unit-data";

function isNumberStr(s: string): boolean {
  return !isNaN(Number(s) - 0) && s.length > 0;
}

// Step 03: Recombine_Units (eqSolverOld.js lines 726-807)
// Marks which tokens in the token array are unit tokens (keyArray = 1),
// then merges adjacent unit tokens into a single composite unit string.
export const recombineUnits: StepFn = async (ctx: SolveContext): Promise<SolveContext> => {
  const tokens  = [...ctx.tokens];
  const keyArray = new Array(tokens.length).fill(0) as number[];

  // Check each index and if it matches a known unit, mark it as 1
  // Legacy uses scaleUnits object keyed by unit symbol; we use SCALE_UNIT_MAP
  for (let index = 0; index < tokens.length; index++) {
    if (SCALE_UNIT_MAP.has(tokens[index])) {
      keyArray[index] = 1;
    }
  }

  // If a *, /, or ^ is surrounded by units, mark it as a unit
  for (let index = 0; index < tokens.length; index++) {
    if (tokens[index] === "*" || tokens[index] === "/") {
      if (keyArray[index - 1] === 1 && keyArray[index + 1] === 1) {
        keyArray[index] = 1;
      }
    }
    if (tokens[index] === "^") {
      if (isNumberStr(tokens[index + 1]) && keyArray[index - 1] === 1) {
        keyArray[index]     = 1;
        keyArray[index + 1] = 1;
      }
    }
  }

  // If parenthesis surround units, mark the parenthesis as units too
  for (let index = 0; index < tokens.length; index++) {
    if (tokens[index] === "(" && keyArray[index + 1] === 1 && keyArray[index] === 0) {
      let flag = 1;
      for (let a = index; a >= 0; a--) {
        if (tokens[a] === "(" && flag === 1) { keyArray[a] = 1; } else { flag = 0; }
      }
    }
    if (tokens[index] === ")" && keyArray[index - 1] === 1 && keyArray[index] === 0) {
      // Find matching opening paren
      let depth = 1;
      let matchingOpen = -1;
      for (let a = index - 1; a >= 0; a--) {
        if (tokens[a] === ")") depth++;
        if (tokens[a] === "(") { depth--; if (depth === 0) { matchingOpen = a; break; } }
      }
      // Only mark as unit paren if the token before the matching "(" is a unit (or operator),
      // not a function name. This prevents sin(30deg) from treating ")" as a unit token.
      // Also require ALL tokens inside the parens to be unit tokens — this prevents
      // expressions like (100mm*150N) from having their ")" swallowed into a unit string.
      if (matchingOpen >= 0) {
        const beforeIsUnit = matchingOpen > 0 && keyArray[matchingOpen - 1] === 1;
        const beforeOpen = matchingOpen > 0 ? tokens[matchingOpen - 1] : "";
        const beforeIsOp = ["/", "*", "^", "(", "+", "-"].includes(beforeOpen);
        const allInnerAreUnits = tokens
          .slice(matchingOpen + 1, index)
          .every((_, offset) => keyArray[matchingOpen + 1 + offset] === 1);
        if ((beforeIsUnit || beforeIsOp || matchingOpen === 0) && allInnerAreUnits) {
          let flag = 1;
          for (let a = index; a < tokens.length; a++) {
            if (tokens[a] === ")" && flag === 1) { keyArray[a] = 1; } else { flag = 0; }
          }
        }
      }
    }
  }

  // Go back through the array again and check to see if *, /, and ^ are surrounded by units
  for (let index = 0; index < tokens.length; index++) {
    if (tokens[index] === "*" || tokens[index] === "/") {
      if (keyArray[index - 1] === 1 && keyArray[index + 1] === 1) { keyArray[index] = 1; }
    }
    if (tokens[index] === "^") {
      if (isNumberStr(tokens[index + 1]) && keyArray[index - 1] === 1) {
        keyArray[index]     = 1;
        keyArray[index + 1] = 1;
      }
    }
  }

  // Check for number followed by space and unit pattern - if found, don't mark that unit
  for (let index = 0; index < tokens.length; index++) {
    const test = tokens[index].match(/^[0-9,.]+\s+[0-9,a-z,A-Z,.,\\,\/,{,},*]+/);
    if (test) { keyArray[index - 1] = 0; }
  }

  // If "/" is between two units, mark it as a unit
  for (let index = 0; index < tokens.length; index++) {
    if (tokens[index] === "/" && keyArray[index - 1] === 1 && keyArray[index + 1] === 1) {
      keyArray[index] = 1;
    }
  }

  // Handle "1/unit" patterns
  for (let index = 0; index < tokens.length; index++) {
    if (tokens[index] === "/" && tokens[index - 1] === "1" && keyArray[index + 1] === 1) {
      keyArray[index]     = 1;
      keyArray[index - 1] = 1;
    }
  }

  // Merge adjacent unit tokens (right-to-left to preserve splice indices)
  for (let index = tokens.length - 1; index > 0; --index) {
    if (keyArray[index] === 1 && keyArray[index - 1] === 1) {
      tokens[index - 1]  = tokens[index - 1] + "" + tokens[index];
      tokens.splice(index, 1);
      keyArray.splice(index, 1);
    }
  }

  return { ...ctx, tokens, keyArray };
};
