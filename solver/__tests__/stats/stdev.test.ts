/**
 * Tests for stdev() — solver/functions/stats/stdev.ts
 *
 * Formula: sqrt(Σ(x - mean)² / n)  — population standard deviation (divides by n, not n-1)
 * Returns a single scalar. The population std dev of a single value is 0.
 *
 * Direct-call tests:
 *   - Single element → 0 (no spread)
 *   - All same values → 0
 *   - [2, 4, 6] → population stdev = √(8/3) ≈ 1.6330
 *   - [0, 0, 0, 6] → population stdev = √(27/4) ≈ 2.598
 *   - Known population stdev: [2, 4, 4, 4, 5, 5, 7, 9] → 2.0
 *   - 2D matrix → stdev of all elements
 *
 * Pipeline tests:
 *   - x = stdev(5) → 0
 *   - Vector via documentEquations → population stdev
 *   - Inline 2D matrix literal → population stdev of all elements
 *
 * Unit tests:
 *   - stdev() operates on the SI-converted numeric values
 *   - stdev of a single SI-converted value → 0
 *   - stdev(v) where v = 5 ft → 0 (single scalar)
 *   - stdev with m/s units → operates on SI values
 */

import { describe, it, expect } from "vitest";
import { stdev } from "../../functions/stats/stdev";
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

function popStdev(vals: number[]) {
  const m = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.sqrt(vals.reduce((a, b) => a + (b - m) ** 2, 0) / vals.length);
}

// ── Direct call tests ──────────────────────────────────────────────────────────

describe("stdev — direct call: scalars", () => {
  it("single element → 0 (no spread)", async () => {
    const r = await stdev([{ "0-0": 5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });

  it("single negative value → 0", async () => {
    const r = await stdev([{ "0-0": -3 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });
});

describe("stdev — direct call: row vectors", () => {
  it("all same values → 0", async () => {
    const r = await stdev([{ "0-0": 7, "0-1": 7, "0-2": 7 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });

  it("[2, 4, 6] → population stdev", async () => {
    const r = await stdev([{ "0-0": 2, "0-1": 4, "0-2": 6 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(popStdev([2, 4, 6]), 10);
  });

  it("[2,4,4,4,5,5,7,9] → population stdev = 2.0", async () => {
    const vals = [2, 4, 4, 4, 5, 5, 7, 9];
    const mat: Record<string, number> = {};
    vals.forEach((v, i) => { mat[`0-${i}`] = v; });
    const r = await stdev([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(2.0, 6);
  });

  it("[0, 0, 0, 6] → correct population stdev", async () => {
    const r = await stdev([{ "0-0": 0, "0-1": 0, "0-2": 0, "0-3": 6 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(popStdev([0, 0, 0, 6]), 10);
  });

  it("negative values → positive stdev", async () => {
    const r = await stdev([{ "0-0": -3, "0-1": -1, "0-2": 1, "0-3": 3 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(popStdev([-3, -1, 1, 3]), 10);
  });
});

describe("stdev — direct call: 2D matrix", () => {
  it("2x2 matrix → stdev of all elements", async () => {
    const mat = { "0-0": 1, "0-1": 2, "1-0": 3, "1-1": 4 };
    const r = await stdev([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(popStdev([1, 2, 3, 4]), 10);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("stdev — pipeline: scalars", () => {
  it("x = stdev(5) → 0", async () => {
    const r = await runPipeline(ctx("x = stdev(5)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });
});

describe("stdev — pipeline: vector via documentEquations", () => {
  it("stdev(v) on [2,4,4,4,5,5,7,9] → 2.0", async () => {
    const vals = [2, 4, 4, 4, 5, 5, 7, 9];
    const c = ctx("y = stdev(v)");
    c.documentEquations = [makeVec("v", vals, -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(2.0, 4);
  });

  it("stdev(v) on [2, 4, 6] → population stdev", async () => {
    const vals = [2, 4, 6];
    const c = ctx("y = stdev(v)");
    c.documentEquations = [makeVec("v", vals, -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(popStdev(vals), 4);
  });
});

describe("stdev — pipeline: inline 2D matrix", () => {
  it("stdev([1,2;3,4]) → population stdev of all elements", async () => {
    const r = await runPipeline(ctx("y = stdev([1,2;3,4])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(popStdev([1, 2, 3, 4]), 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────
// stdev() operates on the SI-converted numeric values of its argument.

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

describe("stdev — simple units (m): single value → 0", () => {
  it("stdev(5 m) → 0 (single scalar)", async () => {
    const r = await solveWith("5", "m", "stdev(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(0, 4);
  });
});

describe("stdev — compound units (m/s): uses SI value", () => {
  it("stdev(4 m/s) → 0 (single scalar)", async () => {
    const r = await solveWith("4", "m/s", "stdev(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(0, 4);
  });
});

describe("stdev — converted units (ft): single value → 0", () => {
  it("stdev(5ft) → 0 (single scalar — no spread)", async () => {
    const r = await runPipeline(ctx("x = stdev(5ft)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });
});
