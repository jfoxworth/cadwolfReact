/**
 * Extended integration tests — regression suite for real-world equations.
 * Add new failing cases here so they can be reproduced and verified as fixed.
 */

import { describe, it, expect } from "vitest";
import { solveDocument } from "../../worker/document-solver";
import type { OrderedBlock } from "../../types";

// ─── Thermodynamics: saturated mixture specific volume ────────────────────────
//
// v_n  = 0.0010432 m³/kg   (saturated liquid specific volume)
// v_g1 = 1.694 m³/kg       (saturated vapor specific volume)
// x_1  = 0.5               (quality, dimensionless)
// v_1  = v_n + x_1 * (v_g1 - v_n)
//
// Expected: v_1 ≈ 0.8475 m³/kg, no errors

describe("Saturated mixture specific volume", () => {
  const blocks: OrderedBlock[] = [
    {
      id: "b1", order: 1, type: "EQUATION",
      definition: { raw: "v_n = 0.0010432 m^3/kg", variableName: "v_n" },
    },
    {
      id: "b2", order: 2, type: "EQUATION",
      definition: { raw: "v_{g1} = 1.694 m^3/kg", variableName: "v_{g1}" },
    },
    {
      id: "b3", order: 3, type: "EQUATION",
      definition: { raw: "x_1 = 0.5", variableName: "x_1" },
    },
    {
      id: "b4", order: 4, type: "EQUATION",
      definition: { raw: "v_1 = v_n + x_1 * (v_{g1} - v_n)", variableName: "v_1" },
    },
  ];

  it("solves all four equations in order without errors", async () => {
    const r1 = await solveDocument(blocks, "b1", []);
    const r2 = await solveDocument(blocks, "b2", r1.resolvedMap);
    const r3 = await solveDocument(blocks, "b3", r2.resolvedMap);
    const r4 = await solveDocument(blocks, "b4", r3.resolvedMap);

    const v_n  = r1.results.find((r) => r.blockId === "b1");
    const v_g1 = r2.results.find((r) => r.blockId === "b2");
    const x_1  = r3.results.find((r) => r.blockId === "b3");
    const v_1  = r4.results.find((r) => r.blockId === "b4");

    // Debug: log errors if any
    if (v_1?.errors?.length) console.log("v_1 errors:", v_1.errors);
    if (v_n?.errors?.length) console.log("v_n errors:", v_n.errors);

    expect(v_n?.errors).toHaveLength(0);
    expect(v_g1?.errors).toHaveLength(0);
    expect(x_1?.errors).toHaveLength(0);
    expect(v_1?.errors).toHaveLength(0);
  });

  it("v_1 has the correct numeric value (~0.8475 m³/kg)", async () => {
    const r1 = await solveDocument(blocks, "b1", []);
    const r2 = await solveDocument(blocks, "b2", r1.resolvedMap);
    const r3 = await solveDocument(blocks, "b3", r2.resolvedMap);
    const r4 = await solveDocument(blocks, "b4", r3.resolvedMap);

    const v_1 = r4.results.find((r) => r.blockId === "b4");
    // v_1 = 0.0010432 + 0.5 * (1.694 - 0.0010432) = 0.8475216
    expect(v_1?.solution?.real["0-0"]).toBeCloseTo(0.8475216, 4);
  });

  it("v_1 has m³/kg units (non-zero baseUnits)", async () => {
    const r1 = await solveDocument(blocks, "b1", []);
    const r2 = await solveDocument(blocks, "b2", r1.resolvedMap);
    const r3 = await solveDocument(blocks, "b3", r2.resolvedMap);
    const r4 = await solveDocument(blocks, "b4", r3.resolvedMap);

    const v_1 = r4.results.find((r) => r.blockId === "b4");
    // Must have units (baseUnits with at least one non-zero entry)
    expect(v_1?.solution?.baseUnits?.some((v) => v !== 0)).toBe(true);
    // Must match the baseUnits of v_n (same physical quantity)
    const v_n = r1.results.find((r) => r.blockId === "b1");
    expect(v_1?.solution?.baseUnits).toEqual(v_n?.solution?.baseUnits);
  });
});

// ─── Diagnostic: inline compound unit on a simple assignment ─────────────────
//
// eq1 = 5 m^3/kg   → should resolve to m³/kg with no errors
//
describe("Diagnostic: simple inline compound unit", () => {
  it("eq1 = 5 m^3/kg resolves to m³/kg", async () => {
    const blocks: OrderedBlock[] = [
      {
        id: "d1", order: 1, type: "EQUATION",
        definition: { raw: "eq1 = 5 m^3/kg", variableName: "eq1" },
      },
    ];
    const r = await solveDocument(blocks, "d1", []);
    const eq1 = r.results.find((res) => res.blockId === "d1");
    if (eq1?.errors?.length) console.log("eq1 errors:", eq1.errors);
    expect(eq1?.errors).toHaveLength(0);
    expect(eq1?.solution?.real["0-0"]).toBeCloseTo(5);
    expect(eq1?.solution?.baseUnits?.some((v) => v !== 0)).toBe(true);
  });
});

// ─── Diagnostic: x_1*(v_{g1}-v_n) with pre-solved variables ─────────────────
//
// eq2 = x_1 * (v_{g1} - v_n)   → dimensionless * m³/kg = m³/kg, no errors
//
describe("Diagnostic: sub-expression x_1*(v_{g1}-v_n)", () => {
  const baseBlocks: OrderedBlock[] = [
    { id: "b1", order: 1, type: "EQUATION", definition: { raw: "v_n = 0.0010432 m^3/kg", variableName: "v_n" } },
    { id: "b2", order: 2, type: "EQUATION", definition: { raw: "v_{g1} = 1.694 m^3/kg",  variableName: "v_{g1}" } },
    { id: "b3", order: 3, type: "EQUATION", definition: { raw: "x_1 = 0.5",               variableName: "x_1" } },
    { id: "b4", order: 4, type: "EQUATION", definition: { raw: "eq2 = x_1 * (v_{g1} - v_n)", variableName: "eq2" } },
  ];

  it("eq2 = x_1*(v_{g1}-v_n) resolves to m³/kg with no errors", async () => {
    const r1 = await solveDocument(baseBlocks, "b1", []);
    const r2 = await solveDocument(baseBlocks, "b2", r1.resolvedMap);
    const r3 = await solveDocument(baseBlocks, "b3", r2.resolvedMap);
    const r4 = await solveDocument(baseBlocks, "b4", r3.resolvedMap);
    const eq2 = r4.results.find((res) => res.blockId === "b4");
    if (eq2?.errors?.length) console.log("eq2 errors:", eq2.errors);
    expect(eq2?.errors).toHaveLength(0);
    // x_1*(v_{g1}-v_n) = 0.5*(1.694-0.0010432) = 0.8464784
    expect(eq2?.solution?.real["0-0"]).toBeCloseTo(0.8464784, 4);
    expect(eq2?.solution?.baseUnits?.some((v) => v !== 0)).toBe(true);
  });
});

// ─── Structural: moment calculation with round() ─────────────────────────────
//
// HorDist = 6 m
// theta   = 30 deg
// Force   = 40 kN
// D       = HorDist * sin(theta)        → 6 * sin(30°) = 3 m
// Moment1 = round(D * Force)            → round(3 m * 40000 N) = 120000 N·m
//
// Expected: D has units of meters, Moment1 has units of N·m (not unitless)
// This test explicitly checks that round() does NOT strip units.

describe("Structural: moment calculation — round() must preserve units", () => {
  const blocks: OrderedBlock[] = [
    { id: "m1", order: 1, type: "EQUATION", definition: { raw: "HorDist = 6 m",       variableName: "HorDist" } },
    { id: "m2", order: 2, type: "EQUATION", definition: { raw: "theta = 30 deg",       variableName: "theta" } },
    { id: "m3", order: 3, type: "EQUATION", definition: { raw: "Force = 40 kN",        variableName: "Force" } },
    { id: "m4", order: 4, type: "EQUATION", definition: { raw: "D = HorDist * sin(theta)", variableName: "D" } },
    { id: "m5", order: 5, type: "EQUATION", definition: { raw: "Moment1 = round(D * Force)", variableName: "Moment1" } },
  ];

  async function solveAll() {
    const r1 = await solveDocument(blocks, "m1", []);
    const r2 = await solveDocument(blocks, "m2", r1.resolvedMap);
    const r3 = await solveDocument(blocks, "m3", r2.resolvedMap);
    const r4 = await solveDocument(blocks, "m4", r3.resolvedMap);
    const r5 = await solveDocument(blocks, "m5", r4.resolvedMap);
    return {
      HorDist: r1.results.find((r) => r.blockId === "m1"),
      theta:   r2.results.find((r) => r.blockId === "m2"),
      Force:   r3.results.find((r) => r.blockId === "m3"),
      D:       r4.results.find((r) => r.blockId === "m4"),
      Moment1: r5.results.find((r) => r.blockId === "m5"),
    };
  }

  it("D = HorDist * sin(theta) solves to ~3 m with no errors", async () => {
    const { D } = await solveAll();
    if (D?.errors?.length) console.log("D errors:", D.errors);
    expect(D?.errors).toHaveLength(0);
    expect(D?.solution?.real["0-0"]).toBeCloseTo(3, 4);
    expect(D?.solution?.baseUnits?.some((v) => v !== 0)).toBe(true);
  });

  it("Moment1 = round(D * Force) has no errors", async () => {
    const { Moment1 } = await solveAll();
    if (Moment1?.errors?.length) console.log("Moment1 errors:", Moment1.errors);
    expect(Moment1?.errors).toHaveLength(0);
  });

  it("Moment1 has the correct numeric value (~120000 N·m)", async () => {
    const { Moment1 } = await solveAll();
    expect(Moment1?.solution?.real["0-0"]).toBeCloseTo(120000, 0);
  });

  it("round() preserves units — Moment1 has N·m baseUnits (non-zero)", async () => {
    const { Moment1 } = await solveAll();
    if (!Moment1?.solution?.baseUnits?.some((v) => v !== 0)) {
      console.log("Moment1 baseUnits:", Moment1?.solution?.baseUnits);
    }
    // If this fails, round() is stripping units — needs to be fixed in the solver
    expect(Moment1?.solution?.baseUnits?.some((v) => v !== 0)).toBe(true);
  });
});

// ─── Vector literal with scaled units ─────────────────────────────────────────

describe("Vector literal with unit-scaled elements", () => {
  it("rOF = [4ft, 1ft, 1ft] → values converted to meters (SI)", async () => {
    const block: OrderedBlock = { id: "b1", order: 1, type: "EQUATION", definition: { raw: "rOF = [4ft, 1ft, 1ft]", variableName: "rOF" } };
    const r = await solveDocument([block], "b1", []);
    const res = r.results.find(res => res.blockId === "b1");
    expect(res?.errors).toHaveLength(0);
    expect(res?.solution?.real?.["0-0"]).toBeCloseTo(4 * 0.3048, 4);
    expect(res?.solution?.real?.["0-1"]).toBeCloseTo(0.3048, 4);
    expect(res?.solution?.real?.["0-2"]).toBeCloseTo(0.3048, 4);
  });

  it("rOF = [4ft, 1ft, 1ft] → baseUnits is non-zero (meter dimension)", async () => {
    const block: OrderedBlock = { id: "b1", order: 1, type: "EQUATION", definition: { raw: "rOF = [4ft, 1ft, 1ft]", variableName: "rOF" } };
    const r = await solveDocument([block], "b1", []);
    const res = r.results.find(res => res.blockId === "b1");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });

  it("v = [1 m, 2 m, 3 m] → baseUnits is non-zero", async () => {
    const block: OrderedBlock = { id: "b1", order: 1, type: "EQUATION", definition: { raw: "v = [1 m, 2 m, 3 m]", variableName: "v" } };
    const r = await solveDocument([block], "b1", []);
    const res = r.results.find(res => res.blockId === "b1");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });

  it("v = [1 kN, 2 kN, 3 kN] → baseUnits is non-zero (force dimension)", async () => {
    const block: OrderedBlock = { id: "b1", order: 1, type: "EQUATION", definition: { raw: "v = [1 kN, 2 kN, 3 kN]", variableName: "v" } };
    const r = await solveDocument([block], "b1", []);
    const res = r.results.find(res => res.blockId === "b1");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });
});

// ─── Regression: unit-in-parens division ─────────────────────────────────────
//
// Dy = (100mm * 150N) / 30mm
//
// The `)` after 150N was being merged into the unit token "N)" which caused:
//   1. "N)" not recognized as a unit → 150 N incorrectly handled
//   2. The `)` disappeared → unmatched `(` ended up in postfix
//   3. Step 26 tried to parse `(` as a number → "Solve3: Cannot parse token '(' as a number"
//
// Expected: (0.1 m * 150 N) / 0.03 m = 500 N (no errors)

describe("Regression: (value unit * value unit) / value unit", () => {
  it("Dy = (100mm*150N)/30mm → no errors, result ≈ 500 N", async () => {
    const block: OrderedBlock = {
      id: "b1", order: 1, type: "EQUATION",
      definition: { raw: "Dy = (100mm*150N)/30mm", variableName: "Dy" },
    };
    const r = await solveDocument([block], "b1", []);
    const res = r.results.find(res => res.blockId === "b1");
    expect(res?.errors).toHaveLength(0);
    // (0.1 m * 150 N) / 0.03 m = 15 N·m / 0.03 m = 500 N
    expect(res?.solution?.real?.["0-0"]).toBeCloseTo(500, 2);
  });

  it("Dy = (100mm*150N)/30mm → result has force units (N)", async () => {
    const block: OrderedBlock = {
      id: "b1", order: 1, type: "EQUATION",
      definition: { raw: "Dy = (100mm*150N)/30mm", variableName: "Dy" },
    };
    const r = await solveDocument([block], "b1", []);
    const res = r.results.find(res => res.blockId === "b1");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });
});
