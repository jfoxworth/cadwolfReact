/**
 * Tests for multi-operand unit algebra (step 16 combined baseUnits).
 * Verifies that multiplying/dividing variables with units produces the
 * correct derived unit in the result.
 */
import { describe, it, expect } from "vitest";
import { runPipeline } from "../../pipeline";
import { CONSTANT_MAP } from "../../units/constant-data";
import type { SolveContext, ResolvedEquation, UnitBaseArray } from "../../types";

const emptyBase: UnitBaseArray = [0, 0, 0, 0, 0, 0, 0, 0];

function makeEq(
  variableName: string,
  value: number,
  units: string,
  baseUnits: UnitBaseArray,
  order: number,
): ResolvedEquation {
  return {
    blockId: variableName,
    order,
    variableName,
    solution: {
      real: { "0-0": value },
      imag: { "0-0": 0 },
      size: "1x1",
      units,
      baseUnits,
      multiplier: 1,
      quantity: "",
    },
    error: null,
  };
}

function ctx(raw: string, documentEquations: ResolvedEquation[] = []): SolveContext {
  return {
    eqId: "t", fileId: "f",
    rawEquation: raw, variableName: "", rhsString: "",
    documentEquations,
    currentBlockOrder: 99,
    constants: CONSTANT_MAP, unitList: [], scaleUnits: [],
    importedFunctions: [], cadParts: {}, datasets: new Map(),
    workingString: raw, tokens: [], keyArray: [],
    variableArray: [], postfixArray: [],
    solution: {
      real: { "0-0": 0 }, imag: { "0-0": 0 }, size: "1x1",
      units: "", baseUnits: emptyBase, multiplier: 1, quantity: "",
    },
    display: { equation: "", solution: "", numericalModel: "", unitsModel: "", dimensionsModel: "", quantitiesModel: "" },
    errors: [],
  };
}

describe("Unit algebra — multi-operand expressions", () => {
  it("grav * density * volume → N (kg·m/s²)", async () => {
    // Simulates: Weight = grav * DensSS304 * W * H * D
    // grav ≈ 9.81 m/s²  ×  8029.94 kg/m³  ×  (0.4064 m)³  ≈ 5289 N
    const density = makeEq("DensSS304", 8029.94036, "kg/m^3", [0,0,0,-3,1,0,0,0], 1);
    const W = makeEq("WeightWidth",  0.4064, "m", [0,0,0,1,0,0,0,0], 2);
    const H = makeEq("WeightHeight", 0.4064, "m", [0,0,0,1,0,0,0,0], 3);
    const D = makeEq("WeightDepth",  0.4064, "m", [0,0,0,1,0,0,0,0], 4);

    const r = await runPipeline(
      ctx("Weight = grav*DensSS304*WeightWidth*WeightHeight*WeightDepth", [density, W, H, D]),
    );

    expect(r.errors).toHaveLength(0);
    // Numeric result ≈ 9.80665 * 8029.94036 * 0.4064³ ≈ 5283 N
    expect(r.solution.real["0-0"]).toBeGreaterThan(5000);
    expect(r.solution.real["0-0"]).toBeLessThan(6000);
    // Base units should be kg·m/s² = N: [A,K,s,m,kg,cd,mol,rad]
    expect(r.solution.baseUnits[2]).toBe(-2);  // s^-2
    expect(r.solution.baseUnits[3]).toBe(1);   // m^1
    expect(r.solution.baseUnits[4]).toBe(1);   // kg^1
  });

  it("Force / Area → Pa (N/m²)", async () => {
    // sigma = Force / Area : N / m² = Pa
    // baseUnits for N: [0,0,-2,1,1,0,0,0]
    // baseUnits for m²: [0,0,0,2,0,0,0,0]
    // result: [0,0,-2,-1,1,0,0,0] = Pa
    // Note: avoid single-letter variable names that collide with unit symbols (A=Ampere, N=Newton)
    const Force = makeEq("Force", 1000, "N",   [0,0,-2,1,1,0,0,0], 1);
    const Area  = makeEq("Area",  0.01, "m^2", [0,0,0,2,0,0,0,0],  2);

    const r = await runPipeline(ctx("sigma = Force / Area", [Force, Area]));

    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(100000); // 1000 / 0.01 = 100 000 Pa
    // Pa base: [A,K,s,m,kg,cd,mol,rad] = [0,0,-2,-1,1,0,0,0]
    expect(r.solution.baseUnits[2]).toBe(-2); // s^-2
    expect(r.solution.baseUnits[3]).toBe(-1); // m^-1
    expect(r.solution.baseUnits[4]).toBe(1);  // kg^1
  });

  it("m * m → m² (length × length = area)", async () => {
    const L1 = makeEq("L1", 3, "m", [0,0,0,1,0,0,0,0], 1);
    const L2 = makeEq("L2", 4, "m", [0,0,0,1,0,0,0,0], 2);

    const r = await runPipeline(ctx("A = L1 * L2", [L1, L2]));

    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(12); // 3 * 4
    expect(r.solution.baseUnits[3]).toBe(2); // m²
  });

  it("single unit equation: density in kg/m³ retains correct base", async () => {
    const r = await runPipeline(ctx("rho = 8029.94036 kg/m^3"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(8029.94036);
    // kg/m³: [A,K,s,m,kg,cd,mol,rad] = [0,0,0,-3,1,0,0,0]
    expect(r.solution.baseUnits[3]).toBe(-3); // m^-3
    expect(r.solution.baseUnits[4]).toBe(1);  // kg^1
  });

  it("addition keeps unit, does not double-count dimensions", async () => {
    // 3 m + 4 m = 7 m (not m²)
    const r = await runPipeline(ctx("x = 3 m + 4 m"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(7);
    expect(r.solution.baseUnits[3]).toBe(1);  // m^1 (not m^2)
  });
});
