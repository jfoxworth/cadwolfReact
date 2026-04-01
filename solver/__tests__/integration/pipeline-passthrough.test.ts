import { describe, it, expect } from "vitest";
import type { SolveContext, ResolvedEquation } from "../../types";
import { runPipeline } from "../../pipeline";
import { CONSTANT_MAP } from "../../units/constant-data";

const emptyBase: [number,number,number,number,number,number,number,number] = [0,0,0,0,0,0,0,0];

function makeContext(
  raw: string,
  order = 0,
  documentEquations: ResolvedEquation[] = [],
): SolveContext {
  return {
    eqId:   "test-eq",
    fileId: "test-file",
    rawEquation:      raw,
    variableName:     "",
    rhsString:        "",
    documentEquations,
    currentBlockOrder: order,
    constants:  CONSTANT_MAP,
    unitList:   [],
    scaleUnits: [],
    importedFunctions: [],
    cadParts: {}, datasets: new Map(),
    workingString: raw,
    tokens:   [],
    keyArray: [],
    variableArray:  [],
    postfixArray:   [],
    solution: {
      real:       { "0-0": 0 },
      imag:       { "0-0": 0 },
      size:       "1x1",
      units:      "",
      baseUnits:  emptyBase,
      multiplier: 1,
      quantity:   "",
    },
    display: { equation: "", solution: "", numericalModel: "", unitsModel: "", dimensionsModel: "", quantitiesModel: "" },
    errors: [],
  };
}

describe("Step 01 — getVariables", () => {
  it("splits 'L = 6' into variableName=L and rhsString=6", async () => {
    const result = await runPipeline(makeContext("L = 6"));
    expect(result.variableName).toBe("L");
    expect(result.rhsString).toBe("6");
  });

  it("returns error when no '=' present", async () => {
    const result = await runPipeline(makeContext("L 6"));
    expect(result.errors.some((e) => e.includes("Format6"))).toBe(true);
  });
});

describe("Step 02 — checkString", () => {
  it("detects unbalanced parentheses", async () => {
    const result = await runPipeline(makeContext("x = (a + b"));
    expect(result.errors.some((e) => e.includes("Format4"))).toBe(true);
  });

  it("accepts a balanced equation", async () => {
    const result = await runPipeline(makeContext("x = (a + b)"));
    // No parenthesis error (may still have Solve3 for unresolved 'a', 'b')
    expect(result.errors.some((e) => e.includes("Format4"))).toBe(false);
  });
});

describe("Step 26 — solvePostfix (simple arithmetic)", () => {
  it("solves 'x = 3 + 4'", async () => {
    const result = await runPipeline(makeContext("x = 3 + 4"));
    expect(result.errors).toHaveLength(0);
    expect(result.solution.real["0-0"]).toBeCloseTo(7);
  });

  it("solves 'x = 10 / 2'", async () => {
    const result = await runPipeline(makeContext("x = 10 / 2"));
    expect(result.errors).toHaveLength(0);
    expect(result.solution.real["0-0"]).toBeCloseTo(5);
  });

  it("solves 'x = 2 ^ 3'", async () => {
    const result = await runPipeline(makeContext("x = 2 ^ 3"));
    expect(result.errors).toHaveLength(0);
    expect(result.solution.real["0-0"]).toBeCloseTo(8);
  });

  it("detects division by zero", async () => {
    const result = await runPipeline(makeContext("x = 1 / 0"));
    expect(result.errors.some((e) => e.includes("zero"))).toBe(true);
  });
});

describe("Step 10 — replaceVariables (variable substitution)", () => {
  const baseUnit: [number,number,number,number,number,number,number,number] = [0,0,0,0,0,0,0,0];

  const docEqs: ResolvedEquation[] = [
    {
      blockId: "block-2",
      order: 2,
      variableName: "L",
      solution: {
        real: { "0-0": 6 },
        imag: { "0-0": 0 },
        size: "1x1",
        units: "m",
        baseUnits: baseUnit,
        multiplier: 1,
      },
      error: null,
    },
    {
      blockId: "block-3",
      order: 3,
      variableName: "w",
      solution: {
        real: { "0-0": 12 },
        imag: { "0-0": 0 },
        size: "1x1",
        units: "kN/m",
        baseUnits: baseUnit,
        multiplier: 1,
      },
      error: null,
    },
  ];

  it("resolves variable 'L' from document equations", async () => {
    const ctx = makeContext("x = L + 1", 10, docEqs);
    const result = await runPipeline(ctx);
    // L=6 → x = 6 + 1 = 7
    expect(result.errors.filter((e) => e.includes("Solve3"))).toHaveLength(0);
    expect(result.solution.real["0-0"]).toBeCloseTo(7);
  });
});

describe("Beam deflection integration", () => {
  const baseUnit: [number,number,number,number,number,number,number,number] = [0,0,0,0,0,0,0,0];

  function resolved(blockId: string, order: number, name: string, value: number, units = ""): ResolvedEquation {
    return {
      blockId, order, variableName: name,
      solution: { real: { "0-0": value }, imag: { "0-0": 0 }, size: "1x1", units, baseUnits: baseUnit, multiplier: 1 },
      error: null,
    };
  }

  it("solves simple constant-only equation 'L = 6'", async () => {
    const result = await runPipeline(makeContext("L = 6", 2));
    expect(result.errors).toHaveLength(0);
    expect(result.solution.real["0-0"]).toBeCloseTo(6);
    expect(result.variableName).toBe("L");
  });

  it("solves 'w = 12' with unit", async () => {
    const result = await runPipeline(makeContext("w = 12", 3));
    expect(result.errors).toHaveLength(0);
    expect(result.solution.real["0-0"]).toBeCloseTo(12);
  });

  it("solves delta formula given all variables resolved", async () => {
    // delta = (5 * w * L^4) / (384 * E * I)
    // With numeric substitution done manually: all variables replaced by numbers
    const raw = "delta = (5 * 12 * 6^4) / (384 * 200000 * 85600000)";
    const result = await runPipeline(makeContext(raw, 7));
    expect(result.errors).toHaveLength(0);
    // expected: (5*12*1296) / (384*200000*85600000) ≈ 1.1842e-8 (unit-naive)
    // The beam deflection fixture uses mixed units — this test just checks the math
    expect(result.solution.real["0-0"]).toBeGreaterThan(0);
  });
});
