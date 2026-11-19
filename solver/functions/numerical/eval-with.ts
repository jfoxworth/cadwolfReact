import type { Matrix, ResolvedEquation, SolveContext, UnitBaseArray } from "../../types";

// Shared by bisect, secant, falsepos, incsearch and ode4. They all evaluate a raw expression
// many times with some variables (x, and for ode4 y0, y1, ...) set to trial values.

/** The unit a variable carries: its SI base-unit exponents and a label for them. */
export interface UnitInfo {
  units: string;
  baseUnits: number[];
}

export interface InjectedVar {
  name: string;
  /** In SI base units, like every value in the solver. */
  value: number;
  /** Omit for a plain number. */
  unit?: UnitInfo;
}

const EMPTY_BASE: UnitBaseArray = [0, 0, 0, 0, 0, 0, 0, 0];

/** Evaluates `rawExpr` with the given variables set. A variable with a unit is injected with
 *  that unit, so an expression like `zA - x` (zA in metres) is checked the same way it would be
 *  in a block. If the expression fails to evaluate this throws: it is never treated as 0. */
export async function evaluateWith(
  rawExpr: string,
  label: string,
  ctx: SolveContext,
  vars: InjectedVar[],
): Promise<number> {
  const { runPipeline } = await import("../../pipeline");
  const names = vars.map((v) => v.name.toLowerCase());

  const injected = vars.map((v): ResolvedEquation => ({
    blockId: `_${label}_${v.name}_`,
    order: -1,
    variableName: v.name,
    solution: {
      real: { "0-0": v.value },
      imag: { "0-0": 0 },
      size: "1x1",
      units: v.unit?.units ?? "",
      baseUnits: (v.unit?.baseUnits as UnitBaseArray | undefined) ?? EMPTY_BASE,
      multiplier: 1,
      quantity: "",
    },
    error: null,
  }));

  const subCtx: SolveContext = {
    ...ctx,
    eqId: `${ctx.eqId}_${label}`,
    rawEquation: `_f_=${rawExpr}`,
    workingString: `_f_=${rawExpr}`,
    variableName: "",
    rhsString: "",
    tokens: [],
    keyArray: [],
    variableArray: [],
    postfixArray: [],
    solution: { real: { "0-0": 0 }, imag: { "0-0": 0 }, size: "1x1", units: "", baseUnits: EMPTY_BASE, multiplier: 1, quantity: "" },
    display: { equation: "", solution: "", numericalModel: "", unitsModel: "", dimensionsModel: "", quantitiesModel: "" },
    errors: [],
    documentEquations: [
      ...ctx.documentEquations.filter((e) => !names.includes(e.variableName.toLowerCase())),
      ...injected,
    ],
  };

  const r = await runPipeline(subCtx);
  if (r.errors.length > 0) {
    const at = vars.map((v) => `${v.name} = ${v.value}`).join(", ");
    throw new Error(`"${rawExpr}" could not be evaluated at ${at}: ${r.errors[0]}`);
  }
  return (r.solution.real["0-0"] ?? 0) * r.solution.multiplier;
}

export type { Matrix };
