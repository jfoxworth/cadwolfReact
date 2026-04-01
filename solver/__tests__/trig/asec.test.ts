/**
 * Tests for asec() — solver/functions/trig/asec.ts
 *
 * Formula: elementwise(args[0], v => Math.acos(1 / v))
 * Input domain: |v| >= 1 (v ≠ 0). Returns values in [0, π] \ {π/2} element-wise.
 * Inverse secant: asec(x) = acos(1/x).
 *
 * Direct-call tests:
 *   - asec(1) → 0
 *   - asec(2) → π/3
 *   - asec(-1) → π
 *   - asec(-2) → 2π/3
 *   - asec(√2) → π/4
 *   - Row vector → element-wise results
 *   - 2D matrix → element-wise results
 *   - Empty matrix → empty
 *
 * Pipeline tests:
 *   - x = asec(1) → 0
 *   - x = asec(2) → π/3
 *   - x = asec(-1) → π
 *   - Vector via documentEquations → element-wise results
 *   - Inline 2D matrix literal → element-wise results
 *
 * Unit tests:
 *   - asec() receives the SI-converted numeric value of its argument
 *   - v = 2 m → SI = 2 → asec(2) = π/3
 *   - v = 4 ft → SI = 4×0.3048 = 1.2192 → asec(1.2192)
 */

import { describe, it, expect } from "vitest";
import { asec } from "../../functions/trig/asec";
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

describe("asec — direct call: scalars", () => {
  it("asec(1) → 0", async () => {
    const r = await asec([{ "0-0": 1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });

  it("asec(2) → π/3", async () => {
    const r = await asec([{ "0-0": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.PI / 3, 10);
  });

  it("asec(-1) → π", async () => {
    const r = await asec([{ "0-0": -1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.PI, 10);
  });

  it("asec(-2) → 2π/3", async () => {
    const r = await asec([{ "0-0": -2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(2 * Math.PI / 3, 10);
  });

  it("asec(√2) → π/4", async () => {
    const r = await asec([{ "0-0": Math.SQRT2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.PI / 4, 10);
  });
});

describe("asec — direct call: vectors", () => {
  it("row vector [1, 2, -1] → [0, π/3, π]", async () => {
    const mat = { "0-0": 1, "0-1": 2, "0-2": -1 };
    const r = await asec([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
    expect(r["0-1"]).toBeCloseTo(Math.PI / 3, 10);
    expect(r["0-2"]).toBeCloseTo(Math.PI, 10);
  });
});

describe("asec — direct call: 2D matrix", () => {
  it("2x2 matrix → element-wise results", async () => {
    const mat = { "0-0": 1, "0-1": 2, "1-0": -1, "1-1": Math.SQRT2 };
    const r = await asec([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
    expect(r["0-1"]).toBeCloseTo(Math.PI / 3, 10);
    expect(r["1-0"]).toBeCloseTo(Math.PI, 10);
    expect(r["1-1"]).toBeCloseTo(Math.PI / 4, 10);
  });
});

describe("asec — direct call: edge cases", () => {
  it("empty matrix → empty result", async () => {
    const r = await asec([{}], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(0);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("asec — pipeline: scalars", () => {
  it("x = asec(1) → 0", async () => {
    const r = await runPipeline(ctx("x = asec(1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });

  it("x = asec(2) → π/3", async () => {
    const r = await runPipeline(ctx("x = asec(2)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.PI / 3, 4);
  });

  it("x = asec(-1) → π", async () => {
    const r = await runPipeline(ctx("x = asec(-1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.PI, 4);
  });
});

describe("asec — pipeline: vector via documentEquations", () => {
  it("asec(v) on [1, 2, -1, √2] → element-wise results", async () => {
    const vals = [1, 2, -1, Math.SQRT2];
    const expected = [0, Math.PI / 3, Math.PI, Math.PI / 4];
    const c = ctx("y = asec(v)");
    c.documentEquations = [makeVec("v", vals, -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expected.forEach((v, i) => {
      expect(r.solution.real[`0-${i}`]).toBeCloseTo(v, 4);
    });
  });
});

describe("asec — pipeline: inline 2D matrix", () => {
  it("asec([1,2;-1,1.4142]) → element-wise results", async () => {
    const r = await runPipeline(ctx("y = asec([1,2;-1,1.4142])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(Math.PI / 3, 4);
    expect(r.solution.real["1-0"]).toBeCloseTo(Math.PI, 4);
    expect(r.solution.real["1-1"]).toBeCloseTo(Math.PI / 4, 3);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────
// asec() receives the SI-converted numeric value. Input |v| must be >= 1.

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

describe("asec — simple units (m): uses SI value", () => {
  it("v = 2 m → asec(v) = π/3", async () => {
    const r = await solveWith("2", "m", "asec(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(Math.PI / 3, 4);
  });

  it("v = 1 m → asec(v) = 0", async () => {
    const r = await solveWith("1", "m", "asec(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(0, 4);
  });
});

describe("asec — converted units (ft): uses SI numeric value", () => {
  it("v = 4 ft → asec(4 × 0.3048) = asec(1.2192)", async () => {
    // 4 ft = 1.2192 m — within domain |v| >= 1
    const r = await solveWith("4", "ft", "asec(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(Math.acos(1 / (4 * FT_M)), 4);
  });
});
