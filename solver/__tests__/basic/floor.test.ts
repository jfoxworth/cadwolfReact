/**
 * Tests for floor() — solver/functions/basic/floor.ts
 *
 * Direct-call tests:
 *   - Positive non-integer → floor
 *   - Negative non-integer → floor (more negative)
 *   - Exact integer → same value
 *   - With unit multiplier (conv_factor) → rounds down to nearest multiple
 *   - Row vector → element-wise floor
 *   - 2D matrix → element-wise floor
 *   - Empty matrix → empty matrix
 *
 * Pipeline tests:
 *   - x = floor(3.9) → 3
 *   - x = floor(-3.1) → -4
 *   - x = floor(5) → 5
 *   - x = floor(0.9) → 0
 *   - Vector via documentEquations → element-wise floor
 *   - Inline 2D matrix literal → element-wise floor
 */

import { describe, it, expect } from "vitest";
import { floor } from "../../functions/basic/floor";
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

describe("floor — direct call: scalars (no multiplier)", () => {
  it("positive non-integer → floor", async () => {
    const r = await floor([{ "0-0": 3.9 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(3, 10);
  });

  it("negative non-integer → floor (more negative)", async () => {
    const r = await floor([{ "0-0": -3.1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-4, 10);
  });

  it("exact positive integer → same value", async () => {
    const r = await floor([{ "0-0": 5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(5, 10);
  });

  it("exact negative integer → same value", async () => {
    const r = await floor([{ "0-0": -4 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-4, 10);
  });

  it("small positive → 0", async () => {
    const r = await floor([{ "0-0": 0.999 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });

  it("small negative → -1", async () => {
    const r = await floor([{ "0-0": -0.001 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-1, 10);
  });
});

describe("floor — direct call: with unit multiplier", () => {
  it("value 1.7 with multiplier 0.5 → 1.5 (nearest 0.5 down)", async () => {
    const r = await floor([{ "0-0": 1.7 }, { "0-0": 0.5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1.5, 10);
  });

  it("value 2.0 with multiplier 0.5 → 2.0 (already a multiple)", async () => {
    const r = await floor([{ "0-0": 2.0 }, { "0-0": 0.5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(2.0, 10);
  });

  it("multiplier of 0 → plain floor (no unit rounding)", async () => {
    const r = await floor([{ "0-0": 3.9 }, { "0-0": 0 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(3, 10);
  });
});

describe("floor — direct call: vectors", () => {
  it("row vector → element-wise floor", async () => {
    const mat = { "0-0": 1.9, "0-1": -2.1, "0-2": 3.0, "0-3": -0.5 };
    const r = await floor([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
    expect(r["0-1"]).toBeCloseTo(-3, 10);
    expect(r["0-2"]).toBeCloseTo(3, 10);
    expect(r["0-3"]).toBeCloseTo(-1, 10);
  });
});

describe("floor — direct call: 2D matrix", () => {
  it("2x2 matrix → element-wise floor", async () => {
    const mat = { "0-0": 1.9, "0-1": 2.1, "1-0": -1.1, "1-1": -2.9 };
    const r = await floor([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
    expect(r["0-1"]).toBeCloseTo(2, 10);
    expect(r["1-0"]).toBeCloseTo(-2, 10);
    expect(r["1-1"]).toBeCloseTo(-3, 10);
  });

  it("3x3 matrix → element-wise floor", async () => {
    const mat = {
      "0-0": 0.9, "0-1": -0.9, "0-2": 2.5,
      "1-0": -3.1, "1-1": 4.0, "1-2": -4.0,
      "2-0": 5.9, "2-1": -5.9, "2-2": 0.0,
    };
    const r = await floor([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
    expect(r["0-1"]).toBeCloseTo(-1, 10);
    expect(r["0-2"]).toBeCloseTo(2, 10);
    expect(r["1-0"]).toBeCloseTo(-4, 10);
    expect(r["1-1"]).toBeCloseTo(4, 10);
    expect(r["1-2"]).toBeCloseTo(-4, 10);
    expect(r["2-0"]).toBeCloseTo(5, 10);
    expect(r["2-1"]).toBeCloseTo(-6, 10);
    expect(r["2-2"]).toBeCloseTo(0, 10);
  });
});

describe("floor — direct call: edge cases", () => {
  it("empty matrix → empty result", async () => {
    const r = await floor([{}], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(0);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("floor — pipeline: scalars", () => {
  it("x = floor(3.9) → 3", async () => {
    const r = await runPipeline(ctx("x = floor(3.9)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(3, 4);
  });

  it("x = floor(-3.1) → -4", async () => {
    const r = await runPipeline(ctx("x = floor(-3.1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(-4, 4);
  });

  it("x = floor(5) → 5", async () => {
    const r = await runPipeline(ctx("x = floor(5)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(5, 4);
  });

  it("x = floor(0.9) → 0", async () => {
    const r = await runPipeline(ctx("x = floor(0.9)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });

  it("x = floor(-0.1) → -1", async () => {
    const r = await runPipeline(ctx("x = floor(-0.1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(-1, 4);
  });
});

describe("floor — pipeline: vector via documentEquations", () => {
  it("floor(v) on [1.9, -2.1, 3.0, -0.5] → [1, -3, 3, -1]", async () => {
    const vals = [1.9, -2.1, 3.0, -0.5];
    const expected = [1, -3, 3, -1];
    const c = ctx("y = floor(v)");
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

describe("floor — pipeline: inline 2D matrix", () => {
  it("floor([1.9,2.1;3.7,4.3]) → [[1,2],[3,4]]", async () => {
    const r = await runPipeline(ctx("y = floor([1.9,2.1;3.7,4.3])"));
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

describe("floor — simple units (m)", () => {
  it("floor(3.9 m) → 3 m", async () => {
    const r = await solveWith("3.9", "m", "floor(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(3, 4);
  });

  it("floor(-3.1 m) → -4 m", async () => {
    const r = await solveWith("-3.1", "m", "floor(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(-4, 4);
  });

  it("floor(5 m) → 5 m (exact integer)", async () => {
    const r = await solveWith("5", "m", "floor(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(5, 4);
  });
});

describe("floor — compound units (m/s)", () => {
  it("floor(-2.3 m/s) → -3 m/s", async () => {
    const r = await solveWith("-2.3", "m/s", "floor(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(-3, 4);
  });

  it("floor(4.9 m/s) → 4 m/s", async () => {
    const r = await solveWith("4.9", "m/s", "floor(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(4, 4);
  });
});

describe("floor — converted units (ft, in, lb)", () => {
  it("floor(4.5ft) → floor(4.5 × 0.3048) = 1", async () => {
    const r = await runPipeline(ctx("x = floor(4.5ft)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.floor(4.5 * FT_M), 4);
  });

  it("floor(60in) → floor(60 × 0.0254) = 1", async () => {
    const r = await runPipeline(ctx("x = floor(60in)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.floor(60 * IN_M), 4);
  });

  it("floor(-2lb) → floor(-2 × 0.4536) = -1", async () => {
    const r = await runPipeline(ctx("x = floor(-2lb)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.floor(-2 * LB_KG), 4);
  });
});
