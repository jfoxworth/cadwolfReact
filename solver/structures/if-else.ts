import type { SolveContext } from "../types";
import { runPipeline } from "../pipeline";

export interface ConditionDef {
  flagText: string;
  conditionText: "==" | "!=" | ">" | ">=" | "<" | "<=";
  dependentText: string;
  /** Connector between this condition and the NEXT one in the same branch. */
  blockOption: "&&" | "||";
}

export async function solveExpression(
  text: string,
  baseCtx: SolveContext,
): Promise<number | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const ctx: SolveContext = {
    ...baseCtx,
    eqId: `__ifcond_${Math.random().toString(36).slice(2)}`,
    rawEquation: `___ifcond = ${trimmed}`,
    workingString: `___ifcond = ${trimmed}`,
    variableName: "",
    rhsString: "",
    tokens: [],
    keyArray: [],
    variableArray: [],
    postfixArray: [],
    errors: [],
  };
  const result = await runPipeline(ctx);
  if (result.errors.length > 0) return null;
  return result.solution.real["0-0"] ?? null;
}

export async function evaluateConditions(
  conditions: ConditionDef[],
  baseCtx: SolveContext,
): Promise<boolean | null> {
  if (conditions.length === 0) return null;
  let result: boolean | null = null;
  for (let i = 0; i < conditions.length; i++) {
    const cond = conditions[i];
    const flagValue = await solveExpression(cond.flagText, baseCtx);
    const depValue  = await solveExpression(cond.dependentText, baseCtx);
    if (flagValue === null || depValue === null) return null;
    let condResult: boolean;
    switch (cond.conditionText) {
      case "==":  condResult = flagValue === depValue; break;
      case "!=":  condResult = flagValue !== depValue; break;
      case ">":   condResult = flagValue >   depValue; break;
      case ">=":  condResult = flagValue >=  depValue; break;
      case "<":   condResult = flagValue <   depValue; break;
      case "<=":  condResult = flagValue <=  depValue; break;
      default:    return null;
    }
    if (i === 0) {
      result = condResult;
    } else {
      result = conditions[i - 1].blockOption === "&&"
        ? result! && condResult
        : result! || condResult;
    }
  }
  return result;
}
