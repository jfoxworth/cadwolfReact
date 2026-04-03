/**
 * Tests for range() — solver/functions/stats/range.ts
 *
 * Formula: Math.max(...values) - Math.min(...values)
 * Returns the statistical range (spread) of all elements. Always >= 0.
 *
 * Direct-call tests:
 *   - Single element → 0 (no spread)
 *   - All same values → 0
 *   - [1, 5] → 4
 *   - [1, 2, 3, 4, 5] → 4
 *   - All negative → max - min (positive result)
 *   - Mixed positive/negative → correct range
 *   - 2D matrix → range across all elements
 *
 * Pipeline tests:
 *   - x = range(5) → 0
 *   - Vector via documentEquations → max - min
 *   - Inline 2D matrix literal → range of all elements
 *
 * Unit tests:
 *   - range() operates on the SI-converted numeric values
 *   - range(5 m) → 0 (single scalar)
 *   - range(5ft) → 0 (single scalar)
 *   - range([1,5] m/s) → 4
 */

import { describe, it, expect } from "vitest";
import { range } from "../../functions/stats/range";
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

describe("range — direct call: scalars", () => {
  it("single element → 0", async () => {
    const r = await range([{ "0-0": 5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });

  it("single negative value → 0", async () => {
    const r = await range([{ "0-0": -3 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });
});

describe("range — direct call: row vectors", () => {
  it("all same values → 0", async () => {
    const r = await range([{ "0-0": 4, "0-1": 4, "0-2": 4 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });

  it("[1, 5] → 4", async () => {
    const r = await range([{ "0-0": 1, "0-1": 5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(4, 10);
  });

  it("[1, 2, 3, 4, 5] → 4", async () => {
    const r = await range([{ "0-0": 1, "0-1": 2, "0-2": 3, "0-3": 4, "0-4": 5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(4, 10);
  });

  it("all negative [-5, -3, -1] → 4", async () => {
    const r = await range([{ "0-0": -5, "0-1": -3, "0-2": -1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(4, 10);
  });

  it("mixed positive/negative [-3, 0, 5] → 8", async () => {
    const r = await range([{ "0-0": -3, "0-1": 0, "0-2": 5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(8, 10);
  });

  it("float values [1.5, 3.7] → 2.2", async () => {
    const r = await range([{ "0-0": 1.5, "0-1": 3.7 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(2.2, 10);
  });
});

describe("range — direct call: 2D matrix", () => {
  it("2x2 matrix [1,2;3,10] → 9", async () => {
    const mat = { "0-0": 1, "0-1": 2, "1-0": 3, "1-1": 10 };
    const r = await range([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(9, 10);
  });

  it("3x3 matrix [1..9] → 8", async () => {
    const mat = {
      "0-0": 1, "0-1": 2, "0-2": 3,
      "1-0": 4, "1-1": 5, "1-2": 6,
      "2-0": 7, "2-1": 8, "2-2": 9,
    };
    const r = await range([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(8, 10);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("range — pipeline: scalars", () => {
  it("x = range(5) → 0", async () => {
    const r = await runPipeline(ctx("x = range(5)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });
});

describe("range — pipeline: vector via documentEquations", () => {
  it("range(v) on [2, 8, 5, 1] → 7", async () => {
    const c = ctx("y = range(v)");
    c.documentEquations = [makeVec("v", [2, 8, 5, 1], -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(7, 4);
  });

  it("range(v) on [-5, 0, 10] → 15", async () => {
    const c = ctx("y = range(v)");
    c.documentEquations = [makeVec("v", [-5, 0, 10], -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(15, 4);
  });
});

describe("range — pipeline: inline 2D matrix", () => {
  it("range([1,2;3,10]) → 9", async () => {
    const r = await runPipeline(ctx("y = range([1,2;3,10])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(9, 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────
// range() operates on the SI-converted numeric values of its argument.

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

describe("range — simple units (m): single value → 0", () => {
  it("range(5 m) → 0 (single scalar)", async () => {
    const r = await solveWith("5", "m", "range(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(0, 4);
  });
});

describe("range — compound units (m/s): uses SI value", () => {
  it("range(4 m/s) → 0 (single scalar)", async () => {
    const r = await solveWith("4", "m/s", "range(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(0, 4);
  });
});

describe("range — unit preservation (inline units)", () => {
  async function solveVecUnit(vecRaw: string, fnRaw: string) {
    const blocks: OrderedBlock[] = [
      { id: "v1", order: 1, type: "EQUATION", definition: { raw: vecRaw, variableName: "x" } },
      { id: "b1", order: 2, type: "EQUATION", definition: { raw: fnRaw, variableName: "y" } },
    ];
    const r1 = await solveDocument(blocks, "v1", []);
    const r2 = await solveDocument(blocks, "b1", r1.resolvedMap);
    return r2.results.find(res => res.blockId === "b1");
  }

  it("range([3,5,7] m) → preserves meter dimension", async () => {
    const res = await solveVecUnit("x = [3, 5, 7] m", "y = range(x)");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });
  it("range([3,5,7] kg*m/s^2) → preserves combined units", async () => {
    const res = await solveVecUnit("x = [3, 5, 7] kg*m/s^2", "y = range(x)");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });
  it("range([3,5,7] km) → preserves scaled unit", async () => {
    const res = await solveVecUnit("x = [3, 5, 7] km", "y = range(x)");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });
  it("range([25,50,75] kN) → preserves complex scaled unit", async () => {
    const res = await solveVecUnit("x = [25, 50, 75] kN", "y = range(x)");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });
});

describe("range — converted units (ft, lb): uses SI numeric value", () => {
  it("range(5ft) → 0 (single scalar — max=min)", async () => {
    const r = await runPipeline(ctx("x = range(5ft)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });

  it("range(2lb) → 0 (single scalar)", async () => {
    const r = await runPipeline(ctx("x = range(2lb)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });
});
