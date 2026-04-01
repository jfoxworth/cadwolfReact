/**
 * Tests for mean() — solver/functions/stats/mean.ts
 *
 * Formula: Object.values(args[0]).reduce((a, b) => a + b, 0) / values.length
 * Returns the arithmetic mean of all elements. Collapses any matrix to a scalar.
 *
 * Direct-call tests:
 *   - Single element → that value
 *   - [2, 4, 6] → 4
 *   - All same values → that value
 *   - Negative values → correct mean
 *   - Mixed positive/negative → correct mean
 *   - 2D matrix → mean of all elements
 *   - Float values → correct mean
 *
 * Pipeline tests:
 *   - x = mean(5) → 5
 *   - x = mean(-3) → -3
 *   - Vector via documentEquations → arithmetic mean
 *   - Inline 2D matrix literal → mean of all elements
 *
 * Unit tests:
 *   - mean() operates on the SI-converted numeric values
 *   - mean(6 m) → 6  (SI value, scalar passthrough)
 *   - mean(v) where v = 3 ft → 3 × 0.3048
 *   - mean(v) where v = [2,4,6] m → 4
 */

import { describe, it, expect } from "vitest";
import { mean } from "../../functions/stats/mean";
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

// ── Direct call tests ──────────────────────────────────────────────────────────

describe("mean — direct call: scalars", () => {
  it("single positive value → that value", async () => {
    const r = await mean([{ "0-0": 5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(5, 10);
  });

  it("single negative value → that value", async () => {
    const r = await mean([{ "0-0": -3 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-3, 10);
  });

  it("zero → 0", async () => {
    const r = await mean([{ "0-0": 0 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });
});

describe("mean — direct call: row vectors", () => {
  it("[2, 4, 6] → 4", async () => {
    const r = await mean([{ "0-0": 2, "0-1": 4, "0-2": 6 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(4, 10);
  });

  it("[1, 2, 3, 4, 5] → 3", async () => {
    const r = await mean([{ "0-0": 1, "0-1": 2, "0-2": 3, "0-3": 4, "0-4": 5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(3, 10);
  });

  it("all same values → that value", async () => {
    const r = await mean([{ "0-0": 7, "0-1": 7, "0-2": 7 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(7, 10);
  });

  it("mixed positive/negative → correct mean", async () => {
    const r = await mean([{ "0-0": -6, "0-1": 0, "0-2": 6 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });

  it("float values → correct mean", async () => {
    const r = await mean([{ "0-0": 1.5, "0-1": 2.5, "0-2": 3.0 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(7 / 3, 10);
  });
});

describe("mean — direct call: 2D matrix", () => {
  it("2x2 matrix [1,2;3,4] → 2.5", async () => {
    const mat = { "0-0": 1, "0-1": 2, "1-0": 3, "1-1": 4 };
    const r = await mean([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(2.5, 10);
  });

  it("3x3 matrix [1..9] → 5", async () => {
    const mat = {
      "0-0": 1, "0-1": 2, "0-2": 3,
      "1-0": 4, "1-1": 5, "1-2": 6,
      "2-0": 7, "2-1": 8, "2-2": 9,
    };
    const r = await mean([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(5, 10);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("mean — pipeline: scalars", () => {
  it("x = mean(5) → 5", async () => {
    const r = await runPipeline(ctx("x = mean(5)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(5, 4);
  });

  it("x = mean(-3) → -3", async () => {
    const r = await runPipeline(ctx("x = mean(-3)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(-3, 4);
  });
});

describe("mean — pipeline: vector via documentEquations", () => {
  it("mean(v) on [2, 4, 6, 8] → 5", async () => {
    const c = ctx("y = mean(v)");
    c.documentEquations = [makeVec("v", [2, 4, 6, 8], -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(5, 4);
  });

  it("mean(v) on [10, 20, 30] → 20", async () => {
    const c = ctx("y = mean(v)");
    c.documentEquations = [makeVec("v", [10, 20, 30], -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(20, 4);
  });
});

describe("mean — pipeline: inline 2D matrix", () => {
  it("mean([1,2;3,4]) → 2.5", async () => {
    const r = await runPipeline(ctx("y = mean([1,2;3,4])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(2.5, 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────
// mean() operates on the SI-converted numeric values of its argument.

const FT_M = 0.3048;
const LB_KG = 0.45359237;

async function solveWith(varVal: string, varUnit: string, fnExpr: string) {
  const blocks: OrderedBlock[] = [
    { id: "vb", order: 1, type: "EQUATION", definition: { raw: `v = ${varVal}`, variableName: "v", unit: varUnit } },
    { id: "xb", order: 2, type: "EQUATION", definition: { raw: `x = ${fnExpr}`, variableName: "x", unit: "" } },
  ];
  const r1 = await solveDocument(blocks, "vb", []);
  const r2 = await solveDocument(blocks, "xb", r1.resolvedMap);
  return r2.results.find((r) => r.blockId === "xb")!;
}

describe("mean — simple units (m): uses SI value", () => {
  it("mean(6 m) → 6 (scalar passthrough)", async () => {
    const r = await solveWith("6", "m", "mean(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(6, 4);
  });

  it("mean(-3 m) → -3", async () => {
    const r = await solveWith("-3", "m", "mean(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(-3, 4);
  });
});

describe("mean — compound units (m/s): uses SI value", () => {
  it("mean(4 m/s) → 4", async () => {
    const r = await solveWith("4", "m/s", "mean(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(4, 4);
  });
});

describe("mean — converted units (ft, lb): uses SI numeric value", () => {
  it("mean(3ft) → 3 × 0.3048", async () => {
    const r = await runPipeline(ctx("x = mean(3ft)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(3 * FT_M, 4);
  });

  it("v = 3 ft → mean(v) = 3 × 0.3048", async () => {
    const r = await solveWith("3", "ft", "mean(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(3 * FT_M, 4);
  });

  it("mean(2lb) → 2 × 0.4536", async () => {
    const r = await runPipeline(ctx("x = mean(2lb)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(2 * LB_KG, 4);
  });
});
