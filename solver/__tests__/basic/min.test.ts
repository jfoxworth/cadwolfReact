/**
 * Tests for min() — solver/functions/basic/min.ts
 *
 * Direct-call tests:
 *   - Single positive value → that value
 *   - Single negative value → that value
 *   - Row vector, min at start → first element
 *   - Row vector, min at end → last element
 *   - Row vector, min in middle → middle element
 *   - All negative values → most negative
 *   - Mixed positive/negative → most negative
 *   - 2D matrix → overall min across all elements
 *   - Duplicate min values → min value
 *
 * Pipeline tests:
 *   - x = min(7) → 7
 *   - x = min(-3) → -3
 *   - Vector via documentEquations → min element
 *   - Inline 2D matrix literal → overall min
 */

import { describe, it, expect } from "vitest";
import { min } from "../../functions/basic/min";
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

describe("min — direct call: scalars", () => {
  it("single positive value → that value", async () => {
    const r = await min([{ "0-0": 7 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(7, 10);
  });

  it("single negative value → that value", async () => {
    const r = await min([{ "0-0": -3 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-3, 10);
  });

  it("zero → 0", async () => {
    const r = await min([{ "0-0": 0 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });
});

describe("min — direct call: row vectors", () => {
  it("min at start of vector", async () => {
    const r = await min([{ "0-0": 1, "0-1": 5, "0-2": 3 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
  });

  it("min at end of vector", async () => {
    const r = await min([{ "0-0": 9, "0-1": 5, "0-2": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(2, 10);
  });

  it("min in middle of vector", async () => {
    const r = await min([{ "0-0": 8, "0-1": 2, "0-2": 6 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(2, 10);
  });

  it("all negative values → most negative", async () => {
    const r = await min([{ "0-0": -10, "0-1": -3, "0-2": -7 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-10, 10);
  });

  it("mixed positive and negative → most negative", async () => {
    const r = await min([{ "0-0": -5, "0-1": 3, "0-2": -1, "0-3": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-5, 10);
  });

  it("duplicate min values → returns that min value", async () => {
    const r = await min([{ "0-0": 2, "0-1": 2, "0-2": 5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(2, 10);
  });

  it("floats → correct min", async () => {
    const r = await min([{ "0-0": 1.5, "0-1": 0.3, "0-2": 2.6 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0.3, 10);
  });
});

describe("min — direct call: 2D matrix", () => {
  it("2x2 matrix → overall min", async () => {
    const mat = { "0-0": 4, "0-1": 1, "1-0": 3, "1-1": 2 };
    const r = await min([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
  });

  it("3x3 matrix → overall min", async () => {
    const mat = {
      "0-0": 5, "0-1": 2, "0-2": 8,
      "1-0": 4, "1-1": 1, "1-2": 6,
      "2-0": 7, "2-1": 9, "2-2": 3,
    };
    const r = await min([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
  });

  it("2x3 matrix with all negatives → most negative", async () => {
    const mat = { "0-0": -5, "0-1": -2, "0-2": -8, "1-0": -1, "1-1": -3, "1-2": -7 };
    const r = await min([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-8, 10);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("min — pipeline: scalars", () => {
  it("x = min(7) → 7", async () => {
    const r = await runPipeline(ctx("x = min(7)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(7, 4);
  });

  it("x = min(-3) → -3", async () => {
    const r = await runPipeline(ctx("x = min(-3)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(-3, 4);
  });
});

describe("min — pipeline: vector via documentEquations", () => {
  it("min(v) on [2, 8, 1, 5] → 1", async () => {
    const c = ctx("y = min(v)");
    c.documentEquations = [makeVec("v", [2, 8, 1, 5], -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
  });

  it("min(v) on all-negative vector → most negative", async () => {
    const c = ctx("y = min(v)");
    c.documentEquations = [makeVec("v", [-4, -1, -9, -2], -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(-9, 4);
  });
});

describe("min — pipeline: inline 2D matrix", () => {
  it("min([4,1;3,2]) → 1", async () => {
    const r = await runPipeline(ctx("y = min([4,1;3,2])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
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

describe("min — simple units (m)", () => {
  it("min(7 m) → 7 m (scalar passthrough)", async () => {
    const r = await solveWith("7", "m", "min(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(7, 4);
  });

  it("min(-3 m) → -3 m", async () => {
    const r = await solveWith("-3", "m", "min(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(-3, 4);
  });
});

describe("min — compound units (m/s)", () => {
  it("min(-5 m/s) → -5 m/s", async () => {
    const r = await solveWith("-5", "m/s", "min(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(-5, 4);
  });
});

describe("min — converted units (ft, lb)", () => {
  it("min(-5ft) → -5 × 0.3048 m", async () => {
    const r = await runPipeline(ctx("x = min(-5ft)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(-5 * FT_M, 4);
  });

  it("min(-2lb) → -2 × 0.4536 kg", async () => {
    const r = await runPipeline(ctx("x = min(-2lb)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(-2 * LB_KG, 4);
  });
});
