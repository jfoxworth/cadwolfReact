/**
 * Tests for tanh() — solver/functions/trig/tanh.ts
 *
 * Formula: elementwise(args[0], Math.tanh)
 * Input domain: all reals. Output range: (-1, 1) element-wise.
 * tanh(x) = sinh(x) / cosh(x). Odd function: tanh(-x) = -tanh(x).
 *
 * Direct-call tests:
 *   - tanh(0) → 0
 *   - tanh(1) → 0.7616
 *   - tanh(-1) → -0.7616 (odd function)
 *   - tanh(large) → approaches 1
 *   - tanh(large negative) → approaches -1
 *   - Row vector → element-wise hyperbolic tangents
 *   - 2D matrix → element-wise hyperbolic tangents
 *   - Empty matrix → empty
 *
 * Pipeline tests:
 *   - x = tanh(0) → 0
 *   - x = tanh(1) → 0.7616
 *   - x = tanh(-1) → -0.7616
 *   - Vector via documentEquations → element-wise hyperbolic tangents
 *   - Inline 2D matrix literal → element-wise hyperbolic tangents
 *
 * Unit tests:
 *   - tanh() receives the SI-converted numeric value of its argument
 *   - v = 1 m → SI = 1 → tanh(1)
 *   - v = 1 ft → SI = 0.3048 → tanh(0.3048)
 */

import { describe, it, expect } from "vitest";
import { tanh } from "../../functions/trig/tanh";
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

describe("tanh — direct call: scalars", () => {
  it("tanh(0) → 0", async () => {
    const r = await tanh([{ "0-0": 0 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });

  it("tanh(1) → 0.7616", async () => {
    const r = await tanh([{ "0-0": 1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.tanh(1), 10);
  });

  it("tanh(-1) → -0.7616 (odd function)", async () => {
    const r = await tanh([{ "0-0": -1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-Math.tanh(1), 10);
  });

  it("tanh(0.5) → 0.4621", async () => {
    const r = await tanh([{ "0-0": 0.5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.tanh(0.5), 10);
  });

  it("tanh(100) → approaches 1", async () => {
    const r = await tanh([{ "0-0": 100 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 4);
  });
});

describe("tanh — direct call: vectors", () => {
  it("row vector [0, 1, -1] → [0, tanh(1), -tanh(1)]", async () => {
    const mat = { "0-0": 0, "0-1": 1, "0-2": -1 };
    const r = await tanh([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
    expect(r["0-1"]).toBeCloseTo(Math.tanh(1), 10);
    expect(r["0-2"]).toBeCloseTo(-Math.tanh(1), 10);
  });
});

describe("tanh — direct call: 2D matrix", () => {
  it("2x2 matrix → element-wise hyperbolic tangents", async () => {
    const mat = { "0-0": 0, "0-1": 1, "1-0": -1, "1-1": 0.5 };
    const r = await tanh([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
    expect(r["0-1"]).toBeCloseTo(Math.tanh(1), 10);
    expect(r["1-0"]).toBeCloseTo(Math.tanh(-1), 10);
    expect(r["1-1"]).toBeCloseTo(Math.tanh(0.5), 10);
  });
});

describe("tanh — direct call: edge cases", () => {
  it("empty matrix → empty result", async () => {
    const r = await tanh([{}], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(0);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("tanh — pipeline: scalars", () => {
  it("x = tanh(0) → 0", async () => {
    const r = await runPipeline(ctx("x = tanh(0)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });

  it("x = tanh(1) → 0.7616", async () => {
    const r = await runPipeline(ctx("x = tanh(1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.tanh(1), 4);
  });

  it("x = tanh(-1) → -0.7616", async () => {
    const r = await runPipeline(ctx("x = tanh(-1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(-Math.tanh(1), 4);
  });
});

describe("tanh — pipeline: vector via documentEquations", () => {
  it("tanh(v) on [0, 1, -1, 0.5] → element-wise hyperbolic tangents", async () => {
    const vals = [0, 1, -1, 0.5];
    const c = ctx("y = tanh(v)");
    c.documentEquations = [makeVec("v", vals, -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    vals.forEach((v, i) => {
      expect(r.solution.real[`0-${i}`]).toBeCloseTo(Math.tanh(v), 4);
    });
  });
});

describe("tanh — pipeline: inline 2D matrix", () => {
  it("tanh([0,1;-1,0.5]) → element-wise hyperbolic tangents", async () => {
    const r = await runPipeline(ctx("y = tanh([0,1;-1,0.5])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(Math.tanh(1), 4);
    expect(r.solution.real["1-0"]).toBeCloseTo(Math.tanh(-1), 4);
    expect(r.solution.real["1-1"]).toBeCloseTo(Math.tanh(0.5), 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────
// tanh() receives the SI-converted numeric value of its argument.

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

describe("tanh — simple units (m): uses SI value", () => {
  it("v = 1 m → tanh(v) = tanh(1)", async () => {
    const r = await solveWith("1", "m", "tanh(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(Math.tanh(1), 4);
  });

  it("v = 0 m → tanh(v) = 0", async () => {
    const r = await solveWith("0", "m", "tanh(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(0, 4);
  });
});

describe("tanh — converted units (ft): uses SI numeric value", () => {
  it("tanh(1ft) → tanh(0.3048)", async () => {
    const r = await runPipeline(ctx("x = tanh(1ft)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.tanh(FT_M), 4);
  });

  it("v = 1 ft → tanh(v) = tanh(0.3048)", async () => {
    const r = await solveWith("1", "ft", "tanh(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(Math.tanh(FT_M), 4);
  });
});
