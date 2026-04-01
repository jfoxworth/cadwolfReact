/**
 * Tests that multiplying/dividing units produces a recognised derived unit.
 * The solver should identify the result as a named SI unit (N, Pa, J, W, …)
 * by matching the computed base-unit exponent array against PARSE_UNIT_MAP.
 */
import { describe, it, expect } from "vitest";
import { runPipeline } from "../../pipeline";
import { CONSTANT_MAP } from "../../units/constant-data";
import type { SolveContext, UnitBaseArray } from "../../types";

const emptyBase: UnitBaseArray = [0, 0, 0, 0, 0, 0, 0, 0];

function ctx(raw: string): SolveContext {
  return {
    eqId: "t", fileId: "f",
    rawEquation: raw, variableName: "", rhsString: "",
    documentEquations: [], currentBlockOrder: 99,
    constants: CONSTANT_MAP, unitList: [], scaleUnits: [], importedFunctions: [], cadParts: {}, datasets: new Map(),
    workingString: raw, tokens: [], keyArray: [], variableArray: [], postfixArray: [],
    solution: { real: { "0-0": 0 }, imag: { "0-0": 0 }, size: "1x1", units: "", baseUnits: emptyBase, multiplier: 1, quantity: "" },
    display: { equation: "", solution: "", numericalModel: "", unitsModel: "", dimensionsModel: "", quantitiesModel: "" },
    errors: [],
  };
}

describe("Derived unit recognition", () => {
  it("5kg * 3m/s^2 → 15 N  (force = mass × acceleration)", async () => {
    const r = await runPipeline(ctx("test = 5kg * 3m/s^2"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(15);
    // Base dimensions: kg·m/s² = N → [A=0, K=0, s=-2, m=1, kg=1, ...]
    expect(r.solution.baseUnits[2]).toBe(-2); // s^-2
    expect(r.solution.baseUnits[3]).toBe(1);  // m^1
    expect(r.solution.baseUnits[4]).toBe(1);  // kg^1
    // Recognised as Newton
    expect(r.solution.units).toBe("N");
    expect(r.solution.quantity).toBe("force");
  });

  it("10 N / 2m^2 → 5 Pa  (pressure = force / area)", async () => {
    const r = await runPipeline(ctx("test = 10N / 2m^2"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(5);
    // Pa = kg/(m·s²): [s=-2, m=-1, kg=1]
    expect(r.solution.baseUnits[2]).toBe(-2);
    expect(r.solution.baseUnits[3]).toBe(-1);
    expect(r.solution.baseUnits[4]).toBe(1);
    expect(r.solution.units).toBe("Pa");
  });

  it("5 N * 3 m → 15 J  (energy = force × distance)", async () => {
    const r = await runPipeline(ctx("test = 5N * 3m"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(15);
    // J = kg·m²/s²: [s=-2, m=2, kg=1]
    expect(r.solution.baseUnits[2]).toBe(-2);
    expect(r.solution.baseUnits[3]).toBe(2);
    expect(r.solution.baseUnits[4]).toBe(1);
    expect(r.solution.units).toBe("J");
  });
});
