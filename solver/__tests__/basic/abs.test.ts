/**
 * Tests for abs() — solver/functions/basic/abs.ts
 *
 * Direct-call tests:
 *   - Positive scalar → same value
 *   - Negative scalar → absolute value
 *   - Zero → zero
 *   - Negative float → absolute value
 *   - Row vector → element-wise absolute value
 *   - 2D matrix → element-wise absolute value
 *   - Empty matrix → empty matrix
 *
 * Pipeline tests:
 *   - x = abs(5) → 5
 *   - x = abs(-5) → 5
 *   - x = abs(-3.7) → 3.7
 *   - x = abs(0) → 0
 *   - Vector via documentEquations → element-wise absolute values
 *   - Inline 2D matrix literal → element-wise absolute values
 */

import { describe, it, expect } from "vitest";
import { abs } from "../../functions/basic/abs";
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

describe("abs — direct call: scalars", () => {
  it("positive scalar → same value", async () => {
    const r = await abs([{ "0-0": 5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(5, 10);
  });

  it("negative scalar → absolute value", async () => {
    const r = await abs([{ "0-0": -5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(5, 10);
  });

  it("zero → zero", async () => {
    const r = await abs([{ "0-0": 0 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });

  it("negative float → absolute value", async () => {
    const r = await abs([{ "0-0": -3.7 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(3.7, 10);
  });
});

describe("abs — direct call: vectors", () => {
  it("row vector → element-wise absolute values", async () => {
    const mat = { "0-0": -3, "0-1": 2, "0-2": -1, "0-3": 0 };
    const r = await abs([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(3, 10);
    expect(r["0-1"]).toBeCloseTo(2, 10);
    expect(r["0-2"]).toBeCloseTo(1, 10);
    expect(r["0-3"]).toBeCloseTo(0, 10);
  });

  it("all-negative vector → all positive", async () => {
    const mat = { "0-0": -10, "0-1": -0.5, "0-2": -100 };
    const r = await abs([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(10, 10);
    expect(r["0-1"]).toBeCloseTo(0.5, 10);
    expect(r["0-2"]).toBeCloseTo(100, 10);
  });
});

describe("abs — direct call: 2D matrix", () => {
  it("2x2 matrix → element-wise absolute values", async () => {
    const mat = { "0-0": -1, "0-1": 2, "1-0": -3, "1-1": 4 };
    const r = await abs([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
    expect(r["0-1"]).toBeCloseTo(2, 10);
    expect(r["1-0"]).toBeCloseTo(3, 10);
    expect(r["1-1"]).toBeCloseTo(4, 10);
  });

  it("3x3 matrix with mixed values", async () => {
    const mat = {
      "0-0": -9, "0-1": 0,  "0-2": 3,
      "1-0": -1, "1-1": -5, "1-2": 7,
      "2-0": 2,  "2-1": -8, "2-2": -6,
    };
    const r = await abs([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(9, 10);
    expect(r["0-1"]).toBeCloseTo(0, 10);
    expect(r["0-2"]).toBeCloseTo(3, 10);
    expect(r["1-0"]).toBeCloseTo(1, 10);
    expect(r["1-1"]).toBeCloseTo(5, 10);
    expect(r["1-2"]).toBeCloseTo(7, 10);
    expect(r["2-0"]).toBeCloseTo(2, 10);
    expect(r["2-1"]).toBeCloseTo(8, 10);
    expect(r["2-2"]).toBeCloseTo(6, 10);
  });
});

describe("abs — direct call: edge cases", () => {
  it("empty matrix → empty result", async () => {
    const r = await abs([{}], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(0);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("abs — pipeline: scalars", () => {
  it("x = abs(5) → 5", async () => {
    const r = await runPipeline(ctx("x = abs(5)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(5, 4);
  });

  it("x = abs(-5) → 5", async () => {
    const r = await runPipeline(ctx("x = abs(-5)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(5, 4);
  });

  it("x = abs(-3.7) → 3.7", async () => {
    const r = await runPipeline(ctx("x = abs(-3.7)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(3.7, 4);
  });

  it("x = abs(0) → 0", async () => {
    const r = await runPipeline(ctx("x = abs(0)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });
});

describe("abs — pipeline: vector via documentEquations", () => {
  it("abs(v) on [-3, 0, 5, -1.5] → [3, 0, 5, 1.5]", async () => {
    const vals = [-3, 0, 5, -1.5];
    const c = ctx("y = abs(v)");
    c.documentEquations = [makeVec("v", vals, -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(Object.keys(r.solution.real)).toHaveLength(vals.length);
    vals.forEach((v, i) => {
      expect(r.solution.real[`0-${i}`]).toBeCloseTo(Math.abs(v), 4);
    });
  });

  it("abs(v) on all-positive vector → unchanged", async () => {
    const vals = [1, 2, 3, 4, 5];
    const c = ctx("y = abs(v)");
    c.documentEquations = [makeVec("v", vals, -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    vals.forEach((v, i) => {
      expect(r.solution.real[`0-${i}`]).toBeCloseTo(v, 4);
    });
  });
});

describe("abs — pipeline: inline 2D matrix", () => {
  it("abs([-1,2;-3,4]) → [[1,2],[3,4]]", async () => {
    const r = await runPipeline(ctx("y = abs([-1,2;-3,4])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(2, 4);
    expect(r.solution.real["1-0"]).toBeCloseTo(3, 4);
    expect(r.solution.real["1-1"]).toBeCloseTo(4, 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────

const FT_M = 0.3048;
const IN_M = 0.0254;
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

describe("abs — simple units (m)", () => {
  it("abs(-5 m) → 5 m", async () => {
    const r = await solveWith("-5", "m", "abs(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(5, 4);
  });

  it("abs(3.7 m) → 3.7 m (already positive)", async () => {
    const r = await solveWith("3.7", "m", "abs(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(3.7, 4);
  });

  it("abs(0 m) → 0 m", async () => {
    const r = await solveWith("0", "m", "abs(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(0, 4);
  });
});

describe("abs — compound units (m/s)", () => {
  it("abs(-10 m/s) → 10 m/s", async () => {
    const r = await solveWith("-10", "m/s", "abs(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(10, 4);
  });

  it("abs(-3.5 N*m) → 3.5 N*m (torque magnitude)", async () => {
    const r = await solveWith("-3.5", "N*m", "abs(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(3.5, 4);
  });
});

describe("abs — unit preservation (inline units)", () => {
  async function solveUnit(raw: string) {
    const block: OrderedBlock = { id: "b1", order: 1, type: "EQUATION", definition: { raw, variableName: "y" } };
    const r = await solveDocument([block], "b1", []);
    return r.results.find(res => res.blockId === "b1");
  }

  it("abs(3 m) → preserves meter dimension", async () => {
    const res = await solveUnit("y = abs(3 m)");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });
  it("abs(3 kg*m/s^2) → preserves combined units", async () => {
    const res = await solveUnit("y = abs(3 kg*m/s^2)");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });
  it("abs(3 km) → preserves scaled unit", async () => {
    const res = await solveUnit("y = abs(3 km)");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });
  it("abs(25 kN) → preserves complex scaled unit", async () => {
    const res = await solveUnit("y = abs(25 kN)");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });
});

describe("abs — converted units (ft, in, lb)", () => {
  it("abs(-5ft) → 5 × 0.3048 m", async () => {
    const r = await runPipeline(ctx("x = abs(-5ft)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(5 * FT_M, 4);
  });

  it("abs(-12in) → 12 × 0.0254 m", async () => {
    const r = await runPipeline(ctx("x = abs(-12in)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(12 * IN_M, 4);
  });

  it("abs(-2lb) → 2 × 0.4536 kg", async () => {
    const r = await runPipeline(ctx("x = abs(-2lb)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(2 * LB_KG, 4);
  });
});
