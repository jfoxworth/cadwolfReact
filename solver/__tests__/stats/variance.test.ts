/**
 * Tests for variance() — solver/functions/stats/variance.ts
 *
 * Formula: Σ(x - mean)² / n  — population variance (divides by n, not n-1)
 * Returns a single scalar. variance = stdev². The variance of a single value is 0.
 *
 * Direct-call tests:
 *   - Single element → 0
 *   - All same values → 0
 *   - [2, 4, 6] → population variance = 8/3 ≈ 2.6667
 *   - [2,4,4,4,5,5,7,9] → variance = 4.0  (since stdev = 2.0)
 *   - 2D matrix → variance of all elements
 *
 * Pipeline tests:
 *   - x = variance(5) → 0
 *   - Vector via documentEquations → population variance
 *   - Inline 2D matrix literal → population variance of all elements
 *
 * Unit tests:
 *   - variance() operates on the SI-converted numeric values
 *   - Single SI-converted value → 0
 *   - variance(5ft) → 0 (single scalar)
 */

import { describe, it, expect } from "vitest";
import { variance } from "../../functions/stats/variance";
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

function popVariance(vals: number[]) {
  const m = vals.reduce((a, b) => a + b, 0) / vals.length;
  return vals.reduce((a, b) => a + (b - m) ** 2, 0) / vals.length;
}

// ── Direct call tests ──────────────────────────────────────────────────────────

describe("variance — direct call: scalars", () => {
  it("single element → 0", async () => {
    const r = await variance([{ "0-0": 5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });

  it("zero → 0", async () => {
    const r = await variance([{ "0-0": 0 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });
});

describe("variance — direct call: row vectors", () => {
  it("all same values → 0", async () => {
    const r = await variance([{ "0-0": 4, "0-1": 4, "0-2": 4 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });

  it("[2, 4, 6] → population variance = 8/3", async () => {
    const r = await variance([{ "0-0": 2, "0-1": 4, "0-2": 6 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(8 / 3, 10);
  });

  it("[2,4,4,4,5,5,7,9] → variance = 4.0", async () => {
    const vals = [2, 4, 4, 4, 5, 5, 7, 9];
    const mat: Record<string, number> = {};
    vals.forEach((v, i) => { mat[`0-${i}`] = v; });
    const r = await variance([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(4.0, 6);
  });

  it("[1, 3, 5, 7] → population variance = 5", async () => {
    const r = await variance([{ "0-0": 1, "0-1": 3, "0-2": 5, "0-3": 7 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(5, 10);
  });

  it("negative values → positive variance", async () => {
    const vals = [-3, -1, 1, 3];
    const mat: Record<string, number> = {};
    vals.forEach((v, i) => { mat[`0-${i}`] = v; });
    const r = await variance([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(popVariance(vals), 10);
  });
});

describe("variance — direct call: 2D matrix", () => {
  it("2x2 matrix → population variance of all elements", async () => {
    const mat = { "0-0": 1, "0-1": 2, "1-0": 3, "1-1": 4 };
    const r = await variance([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(popVariance([1, 2, 3, 4]), 10);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("variance — pipeline: scalars", () => {
  it("x = variance(5) → 0", async () => {
    const r = await runPipeline(ctx("x = variance(5)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });
});

describe("variance — pipeline: vector via documentEquations", () => {
  it("variance(v) on [2,4,4,4,5,5,7,9] → 4.0", async () => {
    const vals = [2, 4, 4, 4, 5, 5, 7, 9];
    const c = ctx("y = variance(v)");
    c.documentEquations = [makeVec("v", vals, -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(4.0, 4);
  });

  it("variance(v) on [2, 4, 6] → 8/3", async () => {
    const vals = [2, 4, 6];
    const c = ctx("y = variance(v)");
    c.documentEquations = [makeVec("v", vals, -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(8 / 3, 4);
  });
});

describe("variance — pipeline: inline 2D matrix", () => {
  it("variance([1,2;3,4]) → population variance", async () => {
    const r = await runPipeline(ctx("y = variance([1,2;3,4])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(popVariance([1, 2, 3, 4]), 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────
// variance() operates on the SI-converted numeric values.

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

describe("variance — simple units (m): single value → 0", () => {
  it("variance(5 m) → 0", async () => {
    const r = await solveWith("5", "m", "variance(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(0, 4);
  });
});

describe("variance — compound units (m/s): single value → 0", () => {
  it("variance(4 m/s) → 0", async () => {
    const r = await solveWith("4", "m/s", "variance(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(0, 4);
  });
});

describe("variance — converted units (ft): single value → 0", () => {
  it("variance(5ft) → 0 (single scalar)", async () => {
    const r = await runPipeline(ctx("x = variance(5ft)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });
});
