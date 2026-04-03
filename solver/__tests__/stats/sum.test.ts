/**
 * Tests for sum() — solver/functions/stats/sum.ts
 *
 * Formula: Object.values(args[0]).reduce((a, b) => a + b, 0)
 * Returns the sum of all elements. Collapses any matrix to a single scalar.
 *
 * Direct-call tests:
 *   - Single element → that value
 *   - Row vector → sum of elements
 *   - All zeros → 0
 *   - Negative values → correct negative sum
 *   - Mixed positive/negative → correct net sum
 *   - 2D matrix → sum of all elements
 *   - Empty matrix → 0 (reduce identity)
 *
 * Pipeline tests:
 *   - x = sum(5) → 5
 *   - x = sum(-3) → -3
 *   - Vector via documentEquations → sum of elements
 *   - Inline 2D matrix literal → sum of all elements
 *
 * Unit tests:
 *   - sum() operates on the SI-converted numeric values
 *   - sum(5 m) → 5  (SI value)
 *   - sum(v) where v = 5 ft → 5 × 0.3048
 *   - sum(v) where v = [1,2,3] m → 6
 */

import { describe, it, expect } from "vitest";
import { sum } from "../../functions/stats/sum";
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

describe("sum — direct call: scalars", () => {
  it("single positive value → that value", async () => {
    const r = await sum([{ "0-0": 5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(5, 10);
  });

  it("single negative value → that value", async () => {
    const r = await sum([{ "0-0": -3 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-3, 10);
  });

  it("zero → 0", async () => {
    const r = await sum([{ "0-0": 0 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });
});

describe("sum — direct call: row vectors", () => {
  it("[1, 2, 3] → 6", async () => {
    const r = await sum([{ "0-0": 1, "0-1": 2, "0-2": 3 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(6, 10);
  });

  it("[0, 0, 0] → 0", async () => {
    const r = await sum([{ "0-0": 0, "0-1": 0, "0-2": 0 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });

  it("all negative [-1, -2, -3] → -6", async () => {
    const r = await sum([{ "0-0": -1, "0-1": -2, "0-2": -3 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-6, 10);
  });

  it("mixed [-5, 3, 2] → 0", async () => {
    const r = await sum([{ "0-0": -5, "0-1": 3, "0-2": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });

  it("[1.5, 2.5, 3.5] → 7.5", async () => {
    const r = await sum([{ "0-0": 1.5, "0-1": 2.5, "0-2": 3.5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(7.5, 10);
  });
});

describe("sum — direct call: 2D matrix", () => {
  it("2x2 matrix → sum of all elements", async () => {
    const mat = { "0-0": 1, "0-1": 2, "1-0": 3, "1-1": 4 };
    const r = await sum([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(10, 10);
  });

  it("3x3 matrix → sum of all elements", async () => {
    const mat = {
      "0-0": 1, "0-1": 2, "0-2": 3,
      "1-0": 4, "1-1": 5, "1-2": 6,
      "2-0": 7, "2-1": 8, "2-2": 9,
    };
    const r = await sum([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(45, 10);
  });
});

describe("sum — direct call: edge cases", () => {
  it("empty matrix → 0 (reduce identity)", async () => {
    const r = await sum([{}], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("sum — pipeline: scalars", () => {
  it("x = sum(5) → 5", async () => {
    const r = await runPipeline(ctx("x = sum(5)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(5, 4);
  });

  it("x = sum(-3) → -3", async () => {
    const r = await runPipeline(ctx("x = sum(-3)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(-3, 4);
  });
});

describe("sum — pipeline: vector via documentEquations", () => {
  it("sum(v) on [1, 2, 3, 4, 5] → 15", async () => {
    const c = ctx("y = sum(v)");
    c.documentEquations = [makeVec("v", [1, 2, 3, 4, 5], -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(15, 4);
  });

  it("sum(v) on [-2, 4, -1, 3] → 4", async () => {
    const c = ctx("y = sum(v)");
    c.documentEquations = [makeVec("v", [-2, 4, -1, 3], -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(4, 4);
  });
});

describe("sum — pipeline: inline 2D matrix", () => {
  it("sum([1,2;3,4]) → 10", async () => {
    const r = await runPipeline(ctx("y = sum([1,2;3,4])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(10, 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────
// sum() operates on the SI-converted numeric values of its argument.

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

describe("sum — simple units (m): uses SI value", () => {
  it("sum(5 m) → 5", async () => {
    const r = await solveWith("5", "m", "sum(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(5, 4);
  });

  it("sum(-3 m) → -3", async () => {
    const r = await solveWith("-3", "m", "sum(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(-3, 4);
  });
});

describe("sum — compound units (m/s): uses SI value", () => {
  it("sum(4 m/s) → 4", async () => {
    const r = await solveWith("4", "m/s", "sum(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(4, 4);
  });
});

describe("sum — unit preservation (inline units)", () => {
  async function solveVecUnit(vecRaw: string, fnRaw: string) {
    const blocks: OrderedBlock[] = [
      { id: "v1", order: 1, type: "EQUATION", definition: { raw: vecRaw, variableName: "x" } },
      { id: "b1", order: 2, type: "EQUATION", definition: { raw: fnRaw, variableName: "y" } },
    ];
    const r1 = await solveDocument(blocks, "v1", []);
    const r2 = await solveDocument(blocks, "b1", r1.resolvedMap);
    return r2.results.find(res => res.blockId === "b1");
  }

  it("sum([3,5,7] m) → preserves meter dimension", async () => {
    const res = await solveVecUnit("x = [3, 5, 7] m", "y = sum(x)");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });
  it("sum([3,5,7] kg*m/s^2) → preserves combined units", async () => {
    const res = await solveVecUnit("x = [3, 5, 7] kg*m/s^2", "y = sum(x)");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });
  it("sum([3,5,7] km) → preserves scaled unit", async () => {
    const res = await solveVecUnit("x = [3, 5, 7] km", "y = sum(x)");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });
  it("sum([25,50,75] kN) → preserves complex scaled unit", async () => {
    const res = await solveVecUnit("x = [25, 50, 75] kN", "y = sum(x)");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });
});

describe("sum — converted units (ft, lb): uses SI numeric value", () => {
  it("sum(5ft) → 5 × 0.3048", async () => {
    const r = await runPipeline(ctx("x = sum(5ft)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(5 * FT_M, 4);
  });

  it("v = 5 ft → sum(v) = 5 × 0.3048", async () => {
    const r = await solveWith("5", "ft", "sum(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(5 * FT_M, 4);
  });

  it("sum(2lb) → 2 × 0.4536", async () => {
    const r = await runPipeline(ctx("x = sum(2lb)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(2 * LB_KG, 4);
  });
});
