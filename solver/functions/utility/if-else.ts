import type { BuiltinFn, Matrix } from "../../types";

const VALID_OPS = new Set(["==", "!=", ">", "<", ">=", "<="]);

/**
 * Core comparison logic for IfElse.
 * Called from step 07 after each numeric argument is resolved to a Matrix.
 *
 * IfElse(testVal, op, compareVal, trueVal[, falseVal])
 *   - For scalars: tests testVal [op] compareVal
 *   - For matrices: ALL elements must satisfy the condition (matches old system)
 *   - Returns trueVal if condition holds, falseVal if not (or 0 if omitted)
 */
export function evaluateIfElse(
  testVal: Matrix,
  operator: string,
  compareVal: Matrix,
  trueVal: Matrix,
  falseVal?: Matrix,
): Matrix {
  const op = operator
    .replace(/&lt;=/g, "<=")
    .replace(/&gt;=/g, ">=")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();

  if (!VALID_OPS.has(op)) {
    throw new Error(`IfElse: operator must be ==, !=, >, <, >=, or <=, got "${op}"`);
  }

  const testKeys = Object.keys(testVal);
  const compareKeys = Object.keys(compareVal);
  let testflag: boolean;

  if (op === "==") {
    if (testKeys.length !== compareKeys.length) {
      testflag = false;
    } else {
      testflag = testKeys.every((k) => testVal[k] === compareVal[k]);
    }
  } else if (op === "!=") {
    if (testKeys.length !== compareKeys.length) {
      testflag = true;
    } else {
      testflag = testKeys.some((k) => testVal[k] !== compareVal[k]);
    }
  } else if (op === ">") {
    testflag = testKeys.length > 0 && testKeys.every((k) => (testVal[k] ?? 0) > (compareVal[k] ?? 0));
  } else if (op === "<") {
    testflag = testKeys.length > 0 && testKeys.every((k) => (testVal[k] ?? 0) < (compareVal[k] ?? 0));
  } else if (op === ">=") {
    testflag = testKeys.length > 0 && testKeys.every((k) => (testVal[k] ?? 0) >= (compareVal[k] ?? 0));
  } else {
    // "<="
    testflag = testKeys.length > 0 && testKeys.every((k) => (testVal[k] ?? 0) <= (compareVal[k] ?? 0));
  }

  if (testflag) return trueVal;
  if (falseVal !== undefined) return falseVal;
  return { "0-0": 0 };
}

// Placeholder — ifElse is dispatched as a special case in step 07
// because rawArgs[1] is an operator string, not a numeric sub-expression.
export const ifElse: BuiltinFn = async (_args, _ctx) => {
  return { "0-0": 0 };
};
