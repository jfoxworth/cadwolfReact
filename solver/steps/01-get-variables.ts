import type { SolveContext, StepFn } from "../types";

// Splits a string into tokens on all math operators, brackets, and whitespace.
// Matches the legacy SplitText() helper from eqSolverOld.js (lines 619-651).
export function splitText(text: string): string[] {
  let t = text.toString().trim();
  t = t.replace(/\s+[+]\s+/g, "?+?");
  t = t.replace(/\s+[-]\s+/g, "?-?");
  t = t.replace(/\s+[*]\s+/g, "?*?");
  t = t.replace(/\.\*/g, "?#?");
  t = t.replace(/\+/g, "?+?");
  t = t.replace(/-/g, "?-?");
  t = t.replace(/\*/g, "?*?");
  t = t.replace(/,/g, "?,?");
  t = t.replace(/;/g, "?;?");
  t = t.replace(/:/g, "?:?");
  t = t.replace(/\s/g, "?");
  t = t.replace(/\]/g, "?]?");
  t = t.replace(/\[/g, "?[?");
  t = t.replace(/\(/g, "?(?");
  t = t.replace(/\)/g, "?)?");
  t = t.replace(/\\/g, "? \\?");
  t = t.replace(/\//g, "?/?");
  t = t.replace(/,+$/, "");
  t = t.replace(/\^/g, "?^?");
  t = t.replace(/\?{2,100}/g, "?");
  t = t.replace(/^\?\-\?/, "-?");
  t = t.trim();
  t = t.replace(/^\?+|\?+$/g, "");
  return t.split("?").filter((s) => s !== "");
}

// Step 01: Get_Variables (eqSolverOld.js lines 604-618)
// Splits the raw equation "name = rhs" into parts and tokenises the RHS.
// Also separates run-together "number+unit" tokens like "6m" → ["6", "m"].
export const getVariables: StepFn = async (ctx: SolveContext): Promise<SolveContext> => {
  const raw = ctx.rawEquation.trim();

  const eqIdx = raw.indexOf("=");
  if (eqIdx < 0) {
    return { ...ctx, errors: [...ctx.errors, "Format6: No '=' found in equation."] };
  }

  const variableName = raw.slice(0, eqIdx).trim();
  // Collapse chained bracket indexing M[a][b] → M[a,b] so step 13 can handle
  // both "time[0][1:67]" and "time[0,1:67]" identically.
  const rhsString = raw.slice(eqIdx + 1).trim().replace(/\]\s*\[/g, ",");

  // Tokenise the RHS
  let tokens = splitText(rhsString);

  // Split tokens of the form "6m" or "12.5kN" → separate number and unit tokens
  for (let a = 0; a < tokens.length; a++) {
    const token = tokens[a];
    if (/^[0-9,.]+[a-zA-Z/*-]+$/.test(token)) {
      const numMatch  = token.match(/^[0-9,.]+/);
      const unitMatch = token.match(/[a-zA-Z/*-]+$/);
      if (numMatch && unitMatch) {
        tokens[a] = numMatch[0];
        tokens.splice(a + 1, 0, unitMatch[0]);
      }
    }
  }

  // Initialise keyArray to all-0 (no tokens are units yet; step 03 marks them)
  const keyArray = new Array(tokens.length).fill(0) as number[];

  return {
    ...ctx,
    variableName,
    rhsString,
    workingString: rhsString,
    tokens,
    keyArray,
  };
};
