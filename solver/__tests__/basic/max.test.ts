/**
 * Tests for max() — solver/functions/basic/max.ts
 *
 * Direct-call tests:
 *   - Single positive value → that value
 *   - Single negative value → that value
 *   - Row vector, max at start → first element
 *   - Row vector, max at end → last element
 *   - Row vector, max in middle → middle element
 *   - All negative values → least negative
 *   - Mixed positive/negative → largest positive
 *   - 2D matrix → overall max across all elements
 *   - Duplicate max values → max value
 *
 * Pipeline tests:
 *   - x = max(7) → 7
 *   - x = max(-3) → -3
 *   - Vector via documentEquations → max element
 *   - Inline 2D matrix literal → overall max
 */

import { describe, it, expect } from "vitest";
import { max } from "../../functions/basic/max";
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

describe("max — direct call: scalars", () => {
  it("single positive value → that value", async () => {
    const r = await max([{ "0-0": 7 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(7, 10);
  });

  it("single negative value → that value", async () => {
    const r = await max([{ "0-0": -3 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-3, 10);
  });

  it("zero → 0", async () => {
    const r = await max([{ "0-0": 0 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });
});

describe("max — direct call: row vectors", () => {
  it("max at start of vector", async () => {
    const r = await max([{ "0-0": 10, "0-1": 3, "0-2": 5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(10, 10);
  });

  it("max at end of vector", async () => {
    const r = await max([{ "0-0": 2, "0-1": 5, "0-2": 9 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(9, 10);
  });

  it("max in middle of vector", async () => {
    const r = await max([{ "0-0": 3, "0-1": 8, "0-2": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(8, 10);
  });

  it("all negative values → least negative", async () => {
    const r = await max([{ "0-0": -10, "0-1": -3, "0-2": -7 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-3, 10);
  });

  it("mixed positive and negative → largest positive", async () => {
    const r = await max([{ "0-0": -5, "0-1": 3, "0-2": -1, "0-3": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(3, 10);
  });

  it("duplicate max values → returns that max value", async () => {
    const r = await max([{ "0-0": 5, "0-1": 5, "0-2": 3 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(5, 10);
  });

  it("floats → correct max", async () => {
    const r = await max([{ "0-0": 1.5, "0-1": 2.7, "0-2": 2.6 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(2.7, 10);
  });
});

describe("max — direct call: 2D matrix", () => {
  it("2x2 matrix → overall max", async () => {
    const mat = { "0-0": 1, "0-1": 5, "1-0": 3, "1-1": 2 };
    const r = await max([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(5, 10);
  });

  it("3x3 matrix → overall max", async () => {
    const mat = {
      "0-0": 1, "0-1": 2, "0-2": 3,
      "1-0": 4, "1-1": 9, "1-2": 6,
      "2-0": 7, "2-1": 8, "2-2": 5,
    };
    const r = await max([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(9, 10);
  });

  it("2x3 matrix with all negatives → largest (least negative)", async () => {
    const mat = { "0-0": -5, "0-1": -2, "0-2": -8, "1-0": -1, "1-1": -3, "1-2": -7 };
    const r = await max([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-1, 10);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("max — pipeline: scalars", () => {
  it("x = max(7) → 7", async () => {
    const r = await runPipeline(ctx("x = max(7)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(7, 4);
  });

  it("x = max(-3) → -3", async () => {
    const r = await runPipeline(ctx("x = max(-3)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(-3, 4);
  });
});

describe("max — pipeline: vector via documentEquations", () => {
  it("max(v) on [2, 8, 5, 1] → 8", async () => {
    const c = ctx("y = max(v)");
    c.documentEquations = [makeVec("v", [2, 8, 5, 1], -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(8, 4);
  });

  it("max(v) on all-negative vector → least negative", async () => {
    const c = ctx("y = max(v)");
    c.documentEquations = [makeVec("v", [-4, -1, -9, -2], -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(-1, 4);
  });
});

describe("max — pipeline: inline 2D matrix", () => {
  it("max([1,5;3,2]) → 5", async () => {
    const r = await runPipeline(ctx("y = max([1,5;3,2])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(5, 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────

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

describe("max — simple units (m)", () => {
  it("max(7 m) → 7 m (scalar passthrough)", async () => {
    const r = await solveWith("7", "m", "max(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(7, 4);
  });

  it("max(-3 m) → -3 m", async () => {
    const r = await solveWith("-3", "m", "max(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(-3, 4);
  });
});

describe("max — compound units (m/s)", () => {
  it("max(5 m/s) → 5 m/s", async () => {
    const r = await solveWith("5", "m/s", "max(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(5, 4);
  });
});

describe("max — converted units (ft, lb)", () => {
  it("max(5ft) → 5 × 0.3048 m", async () => {
    const r = await runPipeline(ctx("x = max(5ft)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(5 * FT_M, 4);
  });

  it("max(2lb) → 2 × 0.4536 kg", async () => {
    const r = await runPipeline(ctx("x = max(2lb)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(2 * LB_KG, 4);
  });
});
