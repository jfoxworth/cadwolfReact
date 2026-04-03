/**
 * Tests for ceil() — solver/functions/basic/ceil.ts
 *
 * Direct-call tests:
 *   - Positive non-integer → ceiling
 *   - Negative non-integer → ceiling (less negative)
 *   - Exact integer → same value
 *   - With unit multiplier (conv_factor) → rounds up to nearest multiple
 *   - Row vector → element-wise ceiling
 *   - 2D matrix → element-wise ceiling
 *   - Empty matrix → empty matrix
 *
 * Pipeline tests:
 *   - x = ceil(3.1) → 4
 *   - x = ceil(-3.9) → -3
 *   - x = ceil(5) → 5
 *   - x = ceil(-0.1) → 0
 *   - Vector via documentEquations → element-wise ceiling
 *   - Inline 2D matrix literal → element-wise ceiling
 */

import { describe, it, expect } from "vitest";
import { ceil } from "../../functions/basic/ceil";
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

describe("ceil — direct call: scalars (no multiplier)", () => {
  it("positive non-integer → ceiling", async () => {
    const r = await ceil([{ "0-0": 3.1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(4, 10);
  });

  it("negative non-integer → ceiling (less negative)", async () => {
    const r = await ceil([{ "0-0": -3.9 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-3, 10);
  });

  it("exact positive integer → same value", async () => {
    const r = await ceil([{ "0-0": 5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(5, 10);
  });

  it("exact negative integer → same value", async () => {
    const r = await ceil([{ "0-0": -4 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-4, 10);
  });

  it("small positive → 1", async () => {
    const r = await ceil([{ "0-0": 0.001 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
  });

  it("small negative → 0", async () => {
    const r = await ceil([{ "0-0": -0.001 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });
});

describe("ceil — direct call: with unit multiplier", () => {
  it("value 1.2 with multiplier 0.5 → 1.5 (nearest 0.5 up)", async () => {
    const r = await ceil([{ "0-0": 1.2 }, { "0-0": 0.5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1.5, 10);
  });

  it("value 2.0 with multiplier 0.5 → 2.0 (already a multiple)", async () => {
    const r = await ceil([{ "0-0": 2.0 }, { "0-0": 0.5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(2.0, 10);
  });

  it("multiplier of 0 → plain ceil (no unit rounding)", async () => {
    const r = await ceil([{ "0-0": 3.1 }, { "0-0": 0 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(4, 10);
  });
});

describe("ceil — direct call: vectors", () => {
  it("row vector → element-wise ceiling", async () => {
    const mat = { "0-0": 1.1, "0-1": -2.9, "0-2": 3.0, "0-3": -0.5 };
    const r = await ceil([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(2, 10);
    expect(r["0-1"]).toBeCloseTo(-2, 10);
    expect(r["0-2"]).toBeCloseTo(3, 10);
    expect(r["0-3"]).toBeCloseTo(0, 10);
  });
});

describe("ceil — direct call: 2D matrix", () => {
  it("2x2 matrix → element-wise ceiling", async () => {
    const mat = { "0-0": 1.1, "0-1": 2.9, "1-0": -1.1, "1-1": -2.9 };
    const r = await ceil([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(2, 10);
    expect(r["0-1"]).toBeCloseTo(3, 10);
    expect(r["1-0"]).toBeCloseTo(-1, 10);
    expect(r["1-1"]).toBeCloseTo(-2, 10);
  });

  it("3x3 matrix → element-wise ceiling", async () => {
    const mat = {
      "0-0": 0.1, "0-1": -0.1, "0-2": 2.5,
      "1-0": -3.9, "1-1": 4.0, "1-2": -4.0,
      "2-0": 5.9, "2-1": -5.9, "2-2": 0.0,
    };
    const r = await ceil([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
    expect(r["0-1"]).toBeCloseTo(0, 10);
    expect(r["0-2"]).toBeCloseTo(3, 10);
    expect(r["1-0"]).toBeCloseTo(-3, 10);
    expect(r["1-1"]).toBeCloseTo(4, 10);
    expect(r["1-2"]).toBeCloseTo(-4, 10);
    expect(r["2-0"]).toBeCloseTo(6, 10);
    expect(r["2-1"]).toBeCloseTo(-5, 10);
    expect(r["2-2"]).toBeCloseTo(0, 10);
  });
});

describe("ceil — direct call: edge cases", () => {
  it("empty matrix → empty result", async () => {
    const r = await ceil([{}], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(0);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("ceil — pipeline: scalars", () => {
  it("x = ceil(3.1) → 4", async () => {
    const r = await runPipeline(ctx("x = ceil(3.1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(4, 4);
  });

  it("x = ceil(-3.9) → -3", async () => {
    const r = await runPipeline(ctx("x = ceil(-3.9)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(-3, 4);
  });

  it("x = ceil(5) → 5", async () => {
    const r = await runPipeline(ctx("x = ceil(5)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(5, 4);
  });

  it("x = ceil(-0.1) → 0", async () => {
    const r = await runPipeline(ctx("x = ceil(-0.1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });

  it("x = ceil(0.9) → 1", async () => {
    const r = await runPipeline(ctx("x = ceil(0.9)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
  });
});

describe("ceil — pipeline: vector via documentEquations", () => {
  it("ceil(v) on [1.1, -2.9, 3.0, -0.5] → [2, -2, 3, 0]", async () => {
    const vals = [1.1, -2.9, 3.0, -0.5];
    const expected = [2, -2, 3, 0];
    const c = ctx("y = ceil(v)");
    c.documentEquations = [makeVec("v", vals, -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(Object.keys(r.solution.real)).toHaveLength(vals.length);
    expected.forEach((v, i) => {
      expect(r.solution.real[`0-${i}`]).toBeCloseTo(v, 4);
    });
  });
});

describe("ceil — pipeline: inline 2D matrix", () => {
  it("ceil([1.1,2.9;3.0,4.3]) → [[2,3],[3,5]]", async () => {
    const r = await runPipeline(ctx("y = ceil([1.1,2.9;3.0,4.3])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(2, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(3, 4);
    expect(r.solution.real["1-0"]).toBeCloseTo(3, 4);
    expect(r.solution.real["1-1"]).toBeCloseTo(5, 4);
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

describe("ceil — simple units (m)", () => {
  it("ceil(3.1 m) → 4 m", async () => {
    const r = await solveWith("3.1", "m", "ceil(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(4, 4);
  });

  it("ceil(-3.9 m) → -3 m", async () => {
    const r = await solveWith("-3.9", "m", "ceil(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(-3, 4);
  });

  it("ceil(5 m) → 5 m (exact integer)", async () => {
    const r = await solveWith("5", "m", "ceil(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(5, 4);
  });
});

describe("ceil — compound units (m/s)", () => {
  it("ceil(2.3 m/s) → 3 m/s", async () => {
    const r = await solveWith("2.3", "m/s", "ceil(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(3, 4);
  });

  it("ceil(-2.3 m/s) → -2 m/s", async () => {
    const r = await solveWith("-2.3", "m/s", "ceil(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(-2, 4);
  });
});

describe("ceil — unit preservation (inline units)", () => {
  async function solveUnit(raw: string) {
    const block: OrderedBlock = { id: "b1", order: 1, type: "EQUATION", definition: { raw, variableName: "y" } };
    const r = await solveDocument([block], "b1", []);
    return r.results.find(res => res.blockId === "b1");
  }

  it("ceil(3 m) → preserves meter dimension", async () => {
    const res = await solveUnit("y = ceil(3 m)");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });
  it("ceil(3 kg*m/s^2) → preserves combined units", async () => {
    const res = await solveUnit("y = ceil(3 kg*m/s^2)");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });
  it("ceil(3 km) → preserves scaled unit", async () => {
    const res = await solveUnit("y = ceil(3 km)");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });
  it("ceil(25 kN) → preserves complex scaled unit", async () => {
    const res = await solveUnit("y = ceil(25 kN)");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });
});

describe("ceil — converted units (ft, in, lb)", () => {
  it("ceil(3.7ft) → ceil(3.7 × 0.3048) = 2", async () => {
    const r = await runPipeline(ctx("x = ceil(3.7ft)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.ceil(3.7 * FT_M), 4);
  });

  it("ceil(48in) → ceil(48 × 0.0254) = 2", async () => {
    const r = await runPipeline(ctx("x = ceil(48in)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.ceil(48 * IN_M), 4);
  });

  it("ceil(-2.5lb) → ceil(-2.5 × 0.4536) = -1", async () => {
    const r = await runPipeline(ctx("x = ceil(-2.5lb)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.ceil(-2.5 * LB_KG), 4);
  });
});
