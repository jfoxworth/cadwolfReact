import type { SolveContext, StepFn } from "../types";
import { BUILTIN_FUNCTIONS } from "../functions/index";

// Step 02: Check_String (eqSolverOld.js lines 666-710)
// Validates the equation structure before any substitution occurs.
// Checks: balanced parens/brackets, reserved names, variable name validity.
export const checkString: StepFn = async (ctx: SolveContext): Promise<SolveContext> => {
  const errors = [...ctx.errors];
  const { tokens, variableName, rhsString, constants } = ctx;

  // Check balanced parentheses and brackets
  let pCounter = 0;
  let bCounter = 0;
  for (const tok of tokens) {
    if (tok === "(") pCounter++;
    if (tok === ")") pCounter--;
    if (tok === "[") bCounter++;
    if (tok === "]") bCounter--;
  }
  if (pCounter !== 0) {
    errors.push(`Format4: Unbalanced parentheses (${pCounter > 0 ? "too many '('" : "too many ')'"})`);
  }
  if (bCounter !== 0) {
    errors.push(`Format5: Unbalanced brackets (${bCounter > 0 ? "too many '['" : "too many ']'"})`);
  }

  // Must have a variable name
  if (!variableName || variableName.trim() === "") {
    errors.push("Format7: Equation has no variable name.");
  }

  // Must have an RHS
  if (!rhsString || rhsString.trim() === "") {
    errors.push("Format6: Equation has no right-hand side.");
  }

  // Variable name must contain at least one letter
  if (!/[a-zA-Z]/.test(variableName)) {
    errors.push("Format13: Variable name must contain at least one letter.");
  }

  // Variable name must not clash with a built-in constant
  if (constants.has(variableName)) {
    errors.push(`Format1: '${variableName}' is a reserved constant name.`);
  }

  // Variable name must not clash with a built-in function
  if (BUILTIN_FUNCTIONS.has(variableName)) {
    errors.push(`Format1: '${variableName}' is a reserved function name.`);
  }

  // systemCount is reserved for the part-tree quantity injected by the system
  if (variableName === "systemCount") {
    errors.push(`Format1: 'systemCount' is a reserved system variable name.`);
  }

  // Variable name must not clash with a full unit name (not single-letter SI prefixes,
  // because common engineering variables like E, G, L, I, etc. are single-letter).
  // In the legacy solver, scaleUnits was keyed by full unit strings, not bare prefix chars.
  // We skip this check to avoid false positives like "E" (Exa prefix) vs "E" (elastic modulus).

  return { ...ctx, errors };
};
