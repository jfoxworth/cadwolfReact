/**
 * Unit rules tests — verifies the four core unit behaviors:
 *
 * 1. Adding a unit to a dimensionless constant → error
 * 2. Adding incompatible units (e.g. length + mass) → error
 * 3. Multiplying / dividing units → correct derived unit
 * 4. Complex derived units are recognized (N, Pa, J, W, …)
 */
import { describe, it, expect } from "vitest";
import { runPipeline } from "../../pipeline";
import { CONSTANT_MAP } from "../../units/constant-data";
import type { SolveContext, ResolvedEquation, UnitBaseArray } from "../../types";

const emptyBase: UnitBaseArray = [0, 0, 0, 0, 0, 0, 0, 0];

/** Build a previously-solved variable to inject into documentEquations. */
function solved(
  variableName: string,
  value: number,
  units: string,
  baseUnits: UnitBaseArray,
  order = 1,
): ResolvedEquation {
  return {
    blockId: variableName, order, variableName, error: null,
    solution: { real: { "0-0": value }, imag: { "0-0": 0 }, size: "1x1", units, baseUnits, multiplier: 1 },
  };
}

/** Build a minimal SolveContext for one equation. */
function ctx(raw: string, documentEquations: ResolvedEquation[] = []): SolveContext {
  return {
    eqId: "t", fileId: "f",
    rawEquation: raw, variableName: "", rhsString: "",
    documentEquations, currentBlockOrder: 99,
    constants: CONSTANT_MAP, unitList: [], scaleUnits: [], importedFunctions: [], cadParts: {}, datasets: new Map(),
    workingString: raw, tokens: [], keyArray: [], variableArray: [], postfixArray: [],
    solution: { real: { "0-0": 0 }, imag: { "0-0": 0 }, size: "1x1", units: "", baseUnits: emptyBase, multiplier: 1, quantity: "" },
    display: { equation: "", solution: "", numericalModel: "", unitsModel: "", dimensionsModel: "", quantitiesModel: "" },
    errors: [],
  };
}

// ─── 1. Adding a unit to a dimensionless constant → error ────────────────────

describe("1. Adding a unit to a dimensionless constant produces an error", () => {
  it("2 + grav  (dimensionless + m/s²) → error", async () => {
    // grav is a constant with units m/s² — adding a bare number to it is invalid
    const r = await runPipeline(ctx("x = 2 + grav"));
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("5 m + 3  (length + dimensionless) → error", async () => {
    const r = await runPipeline(ctx("x = 5 m + 3"));
    expect(r.errors.length).toBeGreaterThan(0);
  });
});

// ─── 2. Adding incompatible units → error ────────────────────────────────────

describe("2. Adding incompatible units produces an error", () => {
  it("length + mass → error", async () => {
    const len  = solved("Len",  2, "m",  [0,0,0,1,0,0,0,0], 1);
    const mass = solved("Mass", 5, "kg", [0,0,0,0,1,0,0,0], 2);
    const r = await runPipeline(ctx("x = Len + Mass", [len, mass]));
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("length + force → error", async () => {
    const len   = solved("Len",   3,    "m", [0,0,0,1,0,0,0,0],    1);
    const force = solved("Force", 100,  "N", [0,0,-2,1,1,0,0,0], 2);
    const r = await runPipeline(ctx("x = Len + Force", [len, force]));
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("meters + seconds → error", async () => {
    const r = await runPipeline(ctx("x = 5 m + 3 s"));
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("kg/m³ + m → error", async () => {
    const density = solved("Density", 8000, "kg/m^3", [0,0,0,-3,1,0,0,0], 1);
    const length  = solved("Length",  2,    "m",      [0,0,0,1,0,0,0,0],  2);
    const r = await runPipeline(ctx("x = Density + Length", [density, length]));
    expect(r.errors.length).toBeGreaterThan(0);
  });
});

// ─── 3. Multiplying / dividing units → correct derived unit ──────────────────

describe("3. Multiplying and dividing units produces correct derived units", () => {
  it("m * m → m² (area)", async () => {
    const L1 = solved("L1", 3, "m", [0,0,0,1,0,0,0,0], 1);
    const L2 = solved("L2", 4, "m", [0,0,0,1,0,0,0,0], 2);
    const r = await runPipeline(ctx("Area = L1 * L2", [L1, L2]));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(12);
    expect(r.solution.baseUnits[3]).toBe(2);  // m²
    expect(r.solution.baseUnits[4]).toBe(0);  // no kg
  });

  it("m * m * m → m³ (volume)", async () => {
    const L1 = solved("L1", 2, "m", [0,0,0,1,0,0,0,0], 1);
    const L2 = solved("L2", 3, "m", [0,0,0,1,0,0,0,0], 2);
    const L3 = solved("L3", 4, "m", [0,0,0,1,0,0,0,0], 3);
    const r = await runPipeline(ctx("Vol = L1 * L2 * L3", [L1, L2, L3]));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(24);
    expect(r.solution.baseUnits[3]).toBe(3);  // m³
  });

  it("m/s (velocity = distance / time)", async () => {
    const dist = solved("Dist", 100, "m", [0,0,0,1,0,0,0,0], 1);
    const time = solved("Time", 10,  "s", [0,0,1,0,0,0,0,0], 2);
    const r = await runPipeline(ctx("vel = Dist / Time", [dist, time]));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(10);
    expect(r.solution.baseUnits[2]).toBe(-1); // s^-1
    expect(r.solution.baseUnits[3]).toBe(1);  // m^1
  });

  it("kg * m/s² → N (force = mass × acceleration)", async () => {
    const mass = solved("Mass", 10,   "kg",   [0,0,0,0,1,0,0,0],   1);
    const accel = solved("Accel", 9.81, "m/s^2", [0,0,-2,1,0,0,0,0], 2);
    const r = await runPipeline(ctx("Wt = Mass * Accel", [mass, accel]));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(98.1);
    // N = kg·m/s²: baseUnits[s=-2, m=1, kg=1]
    expect(r.solution.baseUnits[2]).toBe(-2);
    expect(r.solution.baseUnits[3]).toBe(1);
    expect(r.solution.baseUnits[4]).toBe(1);
  });

  it("N / m² → Pa (stress = force / area)", async () => {
    const force = solved("Force", 5000, "N",   [0,0,-2,1,1,0,0,0], 1);
    const area  = solved("Area",  0.05, "m^2", [0,0,0,2,0,0,0,0],  2);
    const r = await runPipeline(ctx("stress = Force / Area", [force, area]));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(100000);
    // Pa = N/m² = kg/(m·s²): [s=-2, m=-1, kg=1]
    expect(r.solution.baseUnits[2]).toBe(-2);
    expect(r.solution.baseUnits[3]).toBe(-1);
    expect(r.solution.baseUnits[4]).toBe(1);
  });

  it("grav constant × mass × volume → N (weight via density)", async () => {
    // Weight = grav * DensSS304 * WeightWidth * WeightHeight * WeightDepth
    const density = solved("DensSS304",    8029.94036, "kg/m^3", [0,0,0,-3,1,0,0,0], 1);
    const ww      = solved("WeightWidth",  0.4064,     "m",      [0,0,0,1,0,0,0,0],  2);
    const wh      = solved("WeightHeight", 0.4064,     "m",      [0,0,0,1,0,0,0,0],  3);
    const wd      = solved("WeightDepth",  0.4064,     "m",      [0,0,0,1,0,0,0,0],  4);
    const r = await runPipeline(
      ctx("Weight = grav*DensSS304*WeightWidth*WeightHeight*WeightDepth", [density, ww, wh, wd]),
    );
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeGreaterThan(5000);
    expect(r.solution.real["0-0"]).toBeLessThan(6000);
    // N: [s=-2, m=1, kg=1]
    expect(r.solution.baseUnits[2]).toBe(-2);
    expect(r.solution.baseUnits[3]).toBe(1);
    expect(r.solution.baseUnits[4]).toBe(1);
  });
});

// ─── 4. Complex / derived units are recognized ────────────────────────────────

describe("4. Complex derived units are recognized", () => {
  it("kg/m³ base dimensions are correct", async () => {
    const r = await runPipeline(ctx("rho = 7850 kg/m^3"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.baseUnits[3]).toBe(-3); // m^-3
    expect(r.solution.baseUnits[4]).toBe(1);  // kg^1
  });

  it("m/s² base dimensions are correct (acceleration)", async () => {
    const r = await runPipeline(ctx("accel = 9.81 m/s^2"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.baseUnits[2]).toBe(-2); // s^-2
    expect(r.solution.baseUnits[3]).toBe(1);  // m^1
  });

  it("same units can be added without error", async () => {
    // 3 m + 5 m = 8 m — compatible, no error
    const r = await runPipeline(ctx("x = 3 m + 5 m"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(8);
    expect(r.solution.baseUnits[3]).toBe(1); // still m, not m²
  });

  it("unit conversion: 16 in is treated as meters internally", async () => {
    const r = await runPipeline(ctx("x = 16 in"));
    expect(r.errors).toHaveLength(0);
    // 16 in = 16 × 0.0254 m = 0.4064 m
    expect(r.solution.real["0-0"]).toBeCloseTo(0.4064);
    expect(r.solution.baseUnits[3]).toBe(1); // m dimension
  });
});
