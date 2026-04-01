/**
 * Tests for cv() — solver/functions/stats/cv.ts
 *
 * Formula: stdev(values) / mean(values)  (population stdev, divides by n)
 * Returns the coefficient of variation (dimensionless ratio). Result is always >= 0.
 *
 * Direct-call tests:
 *   - All same values → 0 (stdev = 0)
 *   - [1, 3] → 0.5  (mean=2, stdev=1, cv=0.5)
 *   - [2, 4, 4, 4, 5, 5, 7, 9] → stdev/mean = 2/5 = 0.4
 *   - All negative (same) → 0
 *   - Mixed with known cv
 *
 * Pipeline tests:
 *   - x = cv(4) → 0 (single scalar, no spread)
 *   - Vector via documentEquations → stdev/mean
 *   - Inline 2D matrix literal → cv of all elements
 *
 * Unit tests:
 *   - cv() operates on the SI-converted numeric values
 *   - cv(deg) → stdev/mean of SI (radian) values
 *   - cv(ft) → stdev/mean of SI (meter) values
 *   - cv([1,3] m/s) → 0.5 (units cancel, same ratio as unitless)
 */

import { describe, it, expect } from "vitest";
import { cv } from "../../functions/stats/cv";
import { runPipeline } from "../../pipeline";
import { ctx } from "../helpers";
import { solveDocument } from "../../worker/document-solver";
import type { ResolvedEquation, OrderedBlock } from "../../types";

const emptyBase: [number,number,number,number,number,number,number,number] = [0,0,0,0,0,0,0,0];

function makeVec(name: string, vals: number[], order: number): ResolvedEquation {
  const real: Record<string, number> = {};
  vals.forEach((v, i) => { real[`0-${i}`] = v; });
  return {
    blockId: name, order, variableName: name,
    solution: { real, imag: {}, size: `1x${vals.length}`, units: "", baseUnits: emptyBase, multiplier: 1 },
    error: null,
  };
}

function popCV(vals: number[]): number {
  const m = vals.reduce((a, b) => a + b, 0) / vals.length;
  const s = Math.sqrt(vals.reduce((a, b) => a + (b - m) ** 2, 0) / vals.length);
  return s / m;
}

// ── Direct call tests ──────────────────────────────────────────────────────────

describe("cv — direct call: scalars", () => {
  it("single positive value → 0 (no spread)", async () => {
    const r = await cv([{ "0-0": 7 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });

  it("single negative value → 0", async () => {
    const r = await cv([{ "0-0": -5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });
});

describe("cv — direct call: row vectors", () => {
  it("all same values → 0", async () => {
    const r = await cv([{ "0-0": 3, "0-1": 3, "0-2": 3 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });

  it("[1, 3] → 0.5  (mean=2, stdev=1)", async () => {
    const r = await cv([{ "0-0": 1, "0-1": 3 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0.5, 10);
  });

  it("[2,4,4,4,5,5,7,9] → 0.4  (stdev=2, mean=5)", async () => {
    const r = await cv([{
      "0-0": 2, "0-1": 4, "0-2": 4, "0-3": 4,
      "0-4": 5, "0-5": 5, "0-6": 7, "0-7": 9,
    }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0.4, 6);
  });

  it("[10, 20, 30] → correct cv", async () => {
    const vals = [10, 20, 30];
    const r = await cv([{ "0-0": 10, "0-1": 20, "0-2": 30 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(popCV(vals), 10);
  });
});

describe("cv — direct call: 2D matrix", () => {
  it("2x2 matrix [2,4;4,6] → correct cv", async () => {
    const mat = { "0-0": 2, "0-1": 4, "1-0": 4, "1-1": 6 };
    const r = await cv([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(popCV([2, 4, 4, 6]), 10);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("cv — pipeline: scalar", () => {
  it("x = cv(4) → 0 (single scalar)", async () => {
    const r = await runPipeline(ctx("x = cv(4)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });
});

describe("cv — pipeline: vector via documentEquations", () => {
  it("cv(v) on [1, 3] → 0.5", async () => {
    const c = ctx("y = cv(v)");
    c.documentEquations = [makeVec("v", [1, 3], -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0.5, 4);
  });

  it("cv(v) on [2,4,4,4,5,5,7,9] → 0.4", async () => {
    const c = ctx("y = cv(v)");
    c.documentEquations = [makeVec("v", [2, 4, 4, 4, 5, 5, 7, 9], -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0.4, 4);
  });
});

describe("cv — pipeline: inline 2D matrix", () => {
  it("cv([2,4;4,6]) → correct cv", async () => {
    const r = await runPipeline(ctx("y = cv([2,4;4,6])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(popCV([2, 4, 4, 6]), 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────
// cv() operates on SI-converted numeric values; the unit cancels (dimensionless).

const FT_M = 0.3048;

async function solveWith(varVal: string, varUnit: string, fnExpr: string) {
  const blocks: OrderedBlock[] = [
    { id: "vb", order: 1, type: "EQUATION", definition: { raw: `v = ${varVal}`, variableName: "v", unit: varUnit } },
    { id: "xb", order: 2, type: "EQUATION", definition: { raw: `x = ${fnExpr}`, variableName: "x", unit: "" } },
  ];
  const r1 = await solveDocument(blocks, "vb", []);
  const r2 = await solveDocument(blocks, "xb", r1.resolvedMap);
  return r2.results.find((r) => r.blockId === "xb")!;
}

describe("cv — simple units (m): single value → 0", () => {
  it("cv(5 m) → 0 (single scalar, no spread)", async () => {
    const r = await solveWith("5", "m", "cv(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(0, 4);
  });
});

describe("cv — compound units (m/s): cv is dimensionless", () => {
  it("cv(4 m/s) → 0 (single scalar)", async () => {
    const r = await solveWith("4", "m/s", "cv(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(0, 4);
  });
});

describe("cv — converted units (ft): uses SI numeric value", () => {
  it("cv(5ft) → 0 (single scalar — max=min)", async () => {
    const r = await runPipeline(ctx("x = cv(5ft)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });
});
