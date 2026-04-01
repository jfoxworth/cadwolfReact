import { CONSTANT_MAP } from "../units/constant-data";
import type { SolveContext } from "../types";

const emptyBase: [number, number, number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0, 0, 0];

export function ctx(raw: string): SolveContext {
  return {
    eqId: "t", fileId: "f",
    rawEquation: raw, variableName: "", rhsString: "",
    documentEquations: [], currentBlockOrder: 0,
    constants: CONSTANT_MAP, unitList: [], scaleUnits: [],
    importedFunctions: [], cadParts: {}, datasets: new Map(),
    workingString: raw, tokens: [], keyArray: [],
    variableArray: [], postfixArray: [],
    solution: { real: { "0-0": 0 }, imag: { "0-0": 0 }, size: "1x1", units: "", baseUnits: emptyBase, multiplier: 1, quantity: "" },
    display: { equation: "", solution: "", numericalModel: "", unitsModel: "", dimensionsModel: "", quantitiesModel: "" },
    errors: [],
  };
}
