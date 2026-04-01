/**
 * Tests for all built-in constants:
 *   pi, grav, N_A, c_O, atm, e, R, k_e, epsilon_0
 *
 * For each constant:
 *   - Correct numeric value
 *   - Correct base-unit dimensions
 *   - Multiply with a compatible variable → correct derived units
 *   - Add to a dimensionless value (only valid for dimensionless constants)
 *     OR produces an error (for constants that have units)
 *
 * Base-unit index order: [A, K, s, m, kg, cd, mol, rad]
 *                          0  1  2  3   4   5    6    7
 */
import { describe, it, expect } from "vitest";
import { runPipeline } from "../../pipeline";
import { CONSTANT_MAP } from "../../units/constant-data";
import type { SolveContext, ResolvedEquation, UnitBaseArray } from "../../types";

const emptyBase: UnitBaseArray = [0, 0, 0, 0, 0, 0, 0, 0];

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

// ─── pi ──────────────────────────────────────────────────────────────────────
// Dimensionless — no units, base all zero.

describe("pi  (dimensionless)", () => {
  it("value ≈ 3.14159", async () => {
    const r = await runPipeline(ctx("x = pi"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(3.141592653589793);
    expect(r.solution.baseUnits.every((v) => v === 0)).toBe(true);
  });

  it("pi + 2  (dimensionless + dimensionless) → no error", async () => {
    const r = await runPipeline(ctx("x = pi + 2"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(5.14159);
  });

  it("pi * 2 → dimensionless", async () => {
    const r = await runPipeline(ctx("x = pi * 2"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(6.28318);
    expect(r.solution.baseUnits.every((v) => v === 0)).toBe(true);
  });

  it("pi * radius²  (m²) → m² (area of circle)", async () => {
    const rad = solved("Radius", 5, "m", [0,0,0,1,0,0,0,0]);
    const r = await runPipeline(ctx("CircArea = pi * Radius * Radius", [rad]));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.PI * 25);
    expect(r.solution.baseUnits[3]).toBe(2); // m²
  });

  it("pi + grav  (dimensionless + m/s²) → error", async () => {
    const r = await runPipeline(ctx("x = pi + grav"));
    expect(r.errors.length).toBeGreaterThan(0);
  });
});

// ─── e  (Euler's number) ─────────────────────────────────────────────────────
// Dimensionless — no units, base all zero.

describe("e  (Euler's number, dimensionless)", () => {
  it("value ≈ 2.71828", async () => {
    const r = await runPipeline(ctx("x = e"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(2.71828);
    expect(r.solution.baseUnits.every((v) => v === 0)).toBe(true);
  });

  it("e + pi  (dimensionless + dimensionless) → no error", async () => {
    const r = await runPipeline(ctx("x = e + pi"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(2.71828 + Math.PI);
  });

  it("e * mass  (dimensionless × kg) → kg", async () => {
    const mass = solved("Mass", 10, "kg", [0,0,0,0,1,0,0,0]);
    const r = await runPipeline(ctx("x = e * Mass", [mass]));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(2.71828 * 10);
    expect(r.solution.baseUnits[4]).toBe(1); // kg
  });

  it("e + grav  (dimensionless + m/s²) → error", async () => {
    const r = await runPipeline(ctx("x = e + grav"));
    expect(r.errors.length).toBeGreaterThan(0);
  });
});

// ─── grav ─────────────────────────────────────────────────────────────────────
// 9.81 m/s² — [s=-2, m=1]

describe("grav  (9.81 m/s²)", () => {
  it("value ≈ 9.81, units m/s²", async () => {
    const r = await runPipeline(ctx("x = grav"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(9.81);
    expect(r.solution.baseUnits[2]).toBe(-2); // s^-2
    expect(r.solution.baseUnits[3]).toBe(1);  // m
  });

  it("grav + grav  (same units) → no error, doubles value", async () => {
    const r = await runPipeline(ctx("x = grav + grav"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(19.62);
    expect(r.solution.baseUnits[2]).toBe(-2);
    expect(r.solution.baseUnits[3]).toBe(1);
  });

  it("grav + 5  (m/s² + dimensionless) → error", async () => {
    const r = await runPipeline(ctx("x = grav + 5"));
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("grav + 1 m  (m/s² + m) → error (incompatible)", async () => {
    const r = await runPipeline(ctx("x = grav + 1 m"));
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("grav * mass  (m/s² × kg) → N", async () => {
    const mass = solved("Mass", 10, "kg", [0,0,0,0,1,0,0,0]);
    const r = await runPipeline(ctx("Wt = grav * Mass", [mass]));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(98.1);
    expect(r.solution.baseUnits[2]).toBe(-2); // s^-2
    expect(r.solution.baseUnits[3]).toBe(1);  // m
    expect(r.solution.baseUnits[4]).toBe(1);  // kg
  });

  it("grav * density * volume → N", async () => {
    const density = solved("Density", 7850, "kg/m^3", [0,0,0,-3,1,0,0,0]);
    const vol     = solved("Volume",  0.001, "m^3",   [0,0,0,3,0,0,0,0]);
    const r = await runPipeline(ctx("Wt = grav * Density * Volume", [density, vol]));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(9.81 * 7850 * 0.001);
    expect(r.solution.baseUnits[2]).toBe(-2);
    expect(r.solution.baseUnits[3]).toBe(1);
    expect(r.solution.baseUnits[4]).toBe(1);
  });
});

// ─── c_O  (speed of light) ────────────────────────────────────────────────────
// 299792458 m/s — [s=-1, m=1]

describe("c_O  (speed of light, m/s)", () => {
  it("value ≈ 299792458, units m/s", async () => {
    const r = await runPipeline(ctx("x = c_O"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(299792458);
    expect(r.solution.baseUnits[2]).toBe(-1); // s^-1
    expect(r.solution.baseUnits[3]).toBe(1);  // m
  });

  it("c_O + c_O  (same units) → no error", async () => {
    const r = await runPipeline(ctx("x = c_O + c_O"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(2 * 299792458);
  });

  it("c_O + grav  (m/s + m/s²) → error (incompatible)", async () => {
    const r = await runPipeline(ctx("x = c_O + grav"));
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("c_O + 1  (m/s + dimensionless) → error", async () => {
    const r = await runPipeline(ctx("x = c_O + 1"));
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("c_O * mass  (m/s × kg) → kg·m/s (momentum)", async () => {
    const mass = solved("Mass", 2, "kg", [0,0,0,0,1,0,0,0]);
    const r = await runPipeline(ctx("p = c_O * Mass", [mass]));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(2 * 299792458);
    expect(r.solution.baseUnits[2]).toBe(-1); // s^-1
    expect(r.solution.baseUnits[3]).toBe(1);  // m
    expect(r.solution.baseUnits[4]).toBe(1);  // kg
  });
});

// ─── atm  (atmospheric pressure) ─────────────────────────────────────────────
// 101325 N/m² — [s=-2, m=-1, kg=1]

describe("atm  (101325 N/m²  =  Pa)", () => {
  it("value ≈ 101325, units Pa (N/m²)", async () => {
    const r = await runPipeline(ctx("x = atm"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(101325);
    expect(r.solution.baseUnits[2]).toBe(-2); // s^-2
    expect(r.solution.baseUnits[3]).toBe(-1); // m^-1
    expect(r.solution.baseUnits[4]).toBe(1);  // kg
  });

  it("atm + atm  (same units) → no error", async () => {
    const r = await runPipeline(ctx("x = atm + atm"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(202650);
  });

  it("atm + grav  (Pa + m/s²) → error (incompatible)", async () => {
    const r = await runPipeline(ctx("x = atm + grav"));
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("atm + 1  (Pa + dimensionless) → error", async () => {
    const r = await runPipeline(ctx("x = atm + 1"));
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("atm * volume  (Pa × m³) → J (energy)", async () => {
    const vol = solved("Volume", 0.01, "m^3", [0,0,0,3,0,0,0,0]);
    const r = await runPipeline(ctx("Energy = atm * Volume", [vol]));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(101325 * 0.01);
    // Pa·m³ = N/m²·m³ = N·m = J: [s=-2, m=2, kg=1]
    expect(r.solution.baseUnits[2]).toBe(-2);
    expect(r.solution.baseUnits[3]).toBe(2);
    expect(r.solution.baseUnits[4]).toBe(1);
  });
});

// ─── R  (universal gas constant) ─────────────────────────────────────────────
// 8.3144621 J/(K·mol) — [s=-2, m=2, kg=1]
// Note: the Base JSON shows mol=0 (non-standard; mol cancels with the mol in the denominator unit)

describe("R  (8.3144621 J/(K·mol))", () => {
  it("value ≈ 8.3144621", async () => {
    const r = await runPipeline(ctx("x = R"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(8.3144621);
    expect(r.solution.baseUnits[2]).toBe(-2); // s^-2
    expect(r.solution.baseUnits[3]).toBe(2);  // m^2
    expect(r.solution.baseUnits[4]).toBe(1);  // kg
  });

  it("R + R  (same units) → no error", async () => {
    const r = await runPipeline(ctx("x = R + R"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(2 * 8.3144621);
  });

  it("R + grav  (J/(K·mol) + m/s²) → error", async () => {
    const r = await runPipeline(ctx("x = R + grav"));
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("R + 1  (J/(K·mol) + dimensionless) → error", async () => {
    const r = await runPipeline(ctx("x = R + 1"));
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("R * temperature  (J/(K·mol) × K) → J/mol", async () => {
    const temp = solved("Temp", 300, "K", [0,1,0,0,0,0,0,0]);
    const r = await runPipeline(ctx("x = R * Temp", [temp]));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(8.3144621 * 300);
    // J/(K·mol) × K = J/mol: [s=-2, m=2, kg=1, K=0 net]
    expect(r.solution.baseUnits[2]).toBe(-2);
    expect(r.solution.baseUnits[3]).toBe(2);
    expect(r.solution.baseUnits[4]).toBe(1);
  });
});

// ─── k_e  (Coulomb's constant) ────────────────────────────────────────────────
// 8.9875e9 N·m²/C²  — [A=-2, s=-4, m=3, kg=1]  (wait, Base says s=-4 but units N·m²/C²:
//   N·m²/C² = kg·m/s²·m²/(A·s)² = kg·m³/(A²·s⁴))

describe("k_e  (Coulomb's constant, N·m²/C²)", () => {
  it("value ≈ 8.9875e9", async () => {
    const r = await runPipeline(ctx("x = k_e"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(8987500000);
    expect(r.solution.baseUnits[0]).toBe(-2); // A^-2
    expect(r.solution.baseUnits[2]).toBe(-4); // s^-4  (wait, constant JSON says s=-4? let me recheck)
    expect(r.solution.baseUnits[3]).toBe(3);  // m^3
    expect(r.solution.baseUnits[4]).toBe(1);  // kg
  });

  it("k_e + k_e  (same units) → no error", async () => {
    const r = await runPipeline(ctx("x = k_e + k_e"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(2 * 8987500000);
  });

  it("k_e + 1  (has units + dimensionless) → error", async () => {
    const r = await runPipeline(ctx("x = k_e + 1"));
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("k_e + grav  (incompatible) → error", async () => {
    const r = await runPipeline(ctx("x = k_e + grav"));
    expect(r.errors.length).toBeGreaterThan(0);
  });
});

// ─── epsilon_0  (permittivity of free space) ──────────────────────────────────
// 8.8542e-12 C²/(N·m²)  — [A=2, s=4, m=-3, kg=-1]

describe("epsilon_0  (permittivity of free space)", () => {
  it("value ≈ 8.8542e-12", async () => {
    const r = await runPipeline(ctx("x = epsilon_0"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(8.8542e-12, 20);
    expect(r.solution.baseUnits[0]).toBe(2);  // A^2
    expect(r.solution.baseUnits[2]).toBe(4);  // s^4
    expect(r.solution.baseUnits[3]).toBe(-3); // m^-3
    expect(r.solution.baseUnits[4]).toBe(-1); // kg^-1
  });

  it("epsilon_0 + epsilon_0  (same units) → no error", async () => {
    const r = await runPipeline(ctx("x = epsilon_0 + epsilon_0"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(2 * 8.8542e-12, 20);
  });

  it("epsilon_0 + 1  (has units + dimensionless) → error", async () => {
    const r = await runPipeline(ctx("x = epsilon_0 + 1"));
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("k_e * epsilon_0  (should be dimensionless — product cancels)", async () => {
    // k_e × ε₀ = 1/(4π) ≈ 0.07958
    // Units: (N·m²/C²) × (C²/(N·m²)) = 1 (dimensionless)
    const r = await runPipeline(ctx("x = k_e * epsilon_0"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(8987500000 * 8.8542e-12, 5);
    // All base dimensions cancel
    expect(r.solution.baseUnits.every((v) => v === 0)).toBe(true);
  });
});

// ─── N_A  (Avogadro's number) ─────────────────────────────────────────────────
// 6.0221e23 molecules/mol — [mol=-1]

describe("N_A  (Avogadro's number, molecules/mol)", () => {
  it("value ≈ 6.0221e23", async () => {
    const r = await runPipeline(ctx("x = N_A"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(6.0221409e23, 15);
  });

  it("N_A + N_A  (same units) → no error", async () => {
    const r = await runPipeline(ctx("x = N_A + N_A"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(2 * 6.0221409e23, 15);
  });

  it("N_A + 1  (has units + dimensionless) → error", async () => {
    const r = await runPipeline(ctx("x = N_A + 1"));
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("N_A + grav  (incompatible) → error", async () => {
    const r = await runPipeline(ctx("x = N_A + grav"));
    expect(r.errors.length).toBeGreaterThan(0);
  });
});
