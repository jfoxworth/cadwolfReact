/**
 * Tests for median() — solver/functions/stats/median.ts
 *
 * Formula: sorts values, returns middle element (odd n) or average of two middles (even n).
 * Collapses any matrix to a single scalar.
 *
 * Direct-call tests:
 *   - Single element → that value
 *   - Odd-length vector → middle element after sorting
 *   - Even-length vector → average of two middle elements after sorting
 *   - Already sorted → same result
 *   - Reverse sorted → same result as sorted
 *   - Negative values → correct median
 *   - Mixed positive/negative → correct median
 *   - 2D matrix → median of all elements
 *
 * Pipeline tests:
 *   - x = median(5) → 5
 *   - Vector via documentEquations → median
 *   - Inline 2D matrix literal → median of all elements
 *
 * Unit tests:
 *   - median() operates on the SI-converted numeric values
 *   - median(5 m) → 5
 *   - median(5ft) → 5 × 0.3048
 */

import { describe, it, expect } from "vitest";
import { median } from "../../functions/stats/median";
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

describe("median — direct call: scalars", () => {
  it("single element → that value", async () => {
    const r = await median([{ "0-0": 5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(5, 10);
  });

  it("single negative value → that value", async () => {
    const r = await median([{ "0-0": -3 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-3, 10);
  });
});

describe("median — direct call: odd-length vectors", () => {
  it("[3, 1, 2] → 2 (middle after sort)", async () => {
    const r = await median([{ "0-0": 3, "0-1": 1, "0-2": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(2, 10);
  });

  it("[5, 3, 1, 4, 2] → 3", async () => {
    const r = await median([{ "0-0": 5, "0-1": 3, "0-2": 1, "0-3": 4, "0-4": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(3, 10);
  });

  it("already sorted [1, 2, 3, 4, 5] → 3", async () => {
    const r = await median([{ "0-0": 1, "0-1": 2, "0-2": 3, "0-3": 4, "0-4": 5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(3, 10);
  });

  it("reverse sorted [5, 4, 3, 2, 1] → 3", async () => {
    const r = await median([{ "0-0": 5, "0-1": 4, "0-2": 3, "0-3": 2, "0-4": 1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(3, 10);
  });

  it("negative values [-5, -1, -3] → -3", async () => {
    const r = await median([{ "0-0": -5, "0-1": -1, "0-2": -3 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-3, 10);
  });
});

describe("median — direct call: even-length vectors", () => {
  it("[1, 2, 3, 4] → 2.5", async () => {
    const r = await median([{ "0-0": 1, "0-1": 2, "0-2": 3, "0-3": 4 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(2.5, 10);
  });

  it("[4, 2, 8, 6] → 5 (average of 4 and 6 after sort)", async () => {
    const r = await median([{ "0-0": 4, "0-1": 2, "0-2": 8, "0-3": 6 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(5, 10);
  });

  it("[-4, -2, -6, -8] → -5", async () => {
    const r = await median([{ "0-0": -4, "0-1": -2, "0-2": -6, "0-3": -8 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-5, 10);
  });
});

describe("median — direct call: 2D matrix", () => {
  it("2x2 matrix [1,2;3,4] → 2.5", async () => {
    const mat = { "0-0": 1, "0-1": 2, "1-0": 3, "1-1": 4 };
    const r = await median([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(2.5, 10);
  });

  it("3x3 matrix [1..9] → 5", async () => {
    const mat = {
      "0-0": 1, "0-1": 2, "0-2": 3,
      "1-0": 4, "1-1": 5, "1-2": 6,
      "2-0": 7, "2-1": 8, "2-2": 9,
    };
    const r = await median([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(5, 10);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("median — pipeline: scalars", () => {
  it("x = median(5) → 5", async () => {
    const r = await runPipeline(ctx("x = median(5)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(5, 4);
  });
});

describe("median — pipeline: vector via documentEquations", () => {
  it("median(v) on [3, 1, 4, 1, 5] → 3", async () => {
    const c = ctx("y = median(v)");
    c.documentEquations = [makeVec("v", [3, 1, 4, 1, 5], -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(3, 4);
  });

  it("median(v) on [1, 2, 3, 4] → 2.5", async () => {
    const c = ctx("y = median(v)");
    c.documentEquations = [makeVec("v", [1, 2, 3, 4], -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(2.5, 4);
  });
});

describe("median — pipeline: inline 2D matrix", () => {
  it("median([1,2;3,4]) → 2.5", async () => {
    const r = await runPipeline(ctx("y = median([1,2;3,4])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(2.5, 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────
// median() operates on the SI-converted numeric values of its argument.

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

describe("median — simple units (m): uses SI value", () => {
  it("median(5 m) → 5", async () => {
    const r = await solveWith("5", "m", "median(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(5, 4);
  });

  it("median(-3 m) → -3", async () => {
    const r = await solveWith("-3", "m", "median(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(-3, 4);
  });
});

describe("median — compound units (N*m): uses SI value", () => {
  it("median(4 N*m) → 4", async () => {
    const r = await solveWith("4", "N*m", "median(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(4, 4);
  });
});

describe("median — unit preservation (inline units)", () => {
  async function solveVecUnit(vecRaw: string, fnRaw: string) {
    const blocks: OrderedBlock[] = [
      { id: "v1", order: 1, type: "EQUATION", definition: { raw: vecRaw, variableName: "x" } },
      { id: "b1", order: 2, type: "EQUATION", definition: { raw: fnRaw, variableName: "y" } },
    ];
    const r1 = await solveDocument(blocks, "v1", []);
    const r2 = await solveDocument(blocks, "b1", r1.resolvedMap);
    return r2.results.find(res => res.blockId === "b1");
  }

  it("median([3,5,7] m) → preserves meter dimension", async () => {
    const res = await solveVecUnit("x = [3, 5, 7] m", "y = median(x)");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });
  it("median([3,5,7] kg*m/s^2) → preserves combined units", async () => {
    const res = await solveVecUnit("x = [3, 5, 7] kg*m/s^2", "y = median(x)");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });
  it("median([3,5,7] km) → preserves scaled unit", async () => {
    const res = await solveVecUnit("x = [3, 5, 7] km", "y = median(x)");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });
  it("median([25,50,75] kN) → preserves complex scaled unit", async () => {
    const res = await solveVecUnit("x = [25, 50, 75] kN", "y = median(x)");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });
});

describe("median — converted units (ft, lb): uses SI numeric value", () => {
  it("median(5ft) → 5 × 0.3048", async () => {
    const r = await runPipeline(ctx("x = median(5ft)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(5 * FT_M, 4);
  });

  it("v = 5 ft → median(v) = 5 × 0.3048", async () => {
    const r = await solveWith("5", "ft", "median(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(5 * FT_M, 4);
  });
});
