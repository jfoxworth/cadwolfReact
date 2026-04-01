/**
 * Tests for acsc() — solver/functions/trig/acsc.ts
 *
 * Formula: elementwise(args[0], v => Math.asin(1 / v))
 * Input domain: |v| >= 1 (v ≠ 0). Returns values in [-π/2, π/2] \ {0} element-wise.
 * Inverse cosecant: acsc(x) = asin(1/x).
 *
 * Direct-call tests:
 *   - acsc(1) → π/2
 *   - acsc(2) → π/6
 *   - acsc(-1) → -π/2
 *   - acsc(-2) → -π/6
 *   - acsc(√2) → π/4
 *   - Row vector → element-wise results
 *   - 2D matrix → element-wise results
 *   - Empty matrix → empty
 *
 * Pipeline tests:
 *   - x = acsc(1) → π/2
 *   - x = acsc(2) → π/6
 *   - x = acsc(-1) → -π/2
 *   - Vector via documentEquations → element-wise results
 *   - Inline 2D matrix literal → element-wise results
 *
 * Unit tests:
 *   - acsc() receives the SI-converted numeric value of its argument
 *   - v = 2 m → SI = 2 → acsc(2) = π/6
 *   - v = 4 ft → SI = 1.2192 → acsc(1.2192)
 */

import { describe, it, expect } from "vitest";
import { acsc } from "../../functions/trig/acsc";
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

describe("acsc — direct call: scalars", () => {
  it("acsc(1) → π/2", async () => {
    const r = await acsc([{ "0-0": 1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.PI / 2, 10);
  });

  it("acsc(2) → π/6", async () => {
    const r = await acsc([{ "0-0": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.PI / 6, 10);
  });

  it("acsc(-1) → -π/2", async () => {
    const r = await acsc([{ "0-0": -1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-Math.PI / 2, 10);
  });

  it("acsc(-2) → -π/6", async () => {
    const r = await acsc([{ "0-0": -2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-Math.PI / 6, 10);
  });

  it("acsc(√2) → π/4", async () => {
    const r = await acsc([{ "0-0": Math.SQRT2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.PI / 4, 10);
  });
});

describe("acsc — direct call: vectors", () => {
  it("row vector [1, 2, -1] → [π/2, π/6, -π/2]", async () => {
    const mat = { "0-0": 1, "0-1": 2, "0-2": -1 };
    const r = await acsc([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.PI / 2, 10);
    expect(r["0-1"]).toBeCloseTo(Math.PI / 6, 10);
    expect(r["0-2"]).toBeCloseTo(-Math.PI / 2, 10);
  });
});

describe("acsc — direct call: 2D matrix", () => {
  it("2x2 matrix → element-wise results", async () => {
    const mat = { "0-0": 1, "0-1": 2, "1-0": -2, "1-1": Math.SQRT2 };
    const r = await acsc([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.PI / 2, 10);
    expect(r["0-1"]).toBeCloseTo(Math.PI / 6, 10);
    expect(r["1-0"]).toBeCloseTo(-Math.PI / 6, 10);
    expect(r["1-1"]).toBeCloseTo(Math.PI / 4, 10);
  });
});

describe("acsc — direct call: edge cases", () => {
  it("empty matrix → empty result", async () => {
    const r = await acsc([{}], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(0);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("acsc — pipeline: scalars", () => {
  it("x = acsc(1) → π/2", async () => {
    const r = await runPipeline(ctx("x = acsc(1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.PI / 2, 4);
  });

  it("x = acsc(2) → π/6", async () => {
    const r = await runPipeline(ctx("x = acsc(2)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.PI / 6, 4);
  });

  it("x = acsc(-1) → -π/2", async () => {
    const r = await runPipeline(ctx("x = acsc(-1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(-Math.PI / 2, 4);
  });
});

describe("acsc — pipeline: vector via documentEquations", () => {
  it("acsc(v) on [1, 2, -1, √2] → element-wise results", async () => {
    const vals = [1, 2, -1, Math.SQRT2];
    const expected = [Math.PI / 2, Math.PI / 6, -Math.PI / 2, Math.PI / 4];
    const c = ctx("y = acsc(v)");
    c.documentEquations = [makeVec("v", vals, -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expected.forEach((v, i) => {
      expect(r.solution.real[`0-${i}`]).toBeCloseTo(v, 4);
    });
  });
});

describe("acsc — pipeline: inline 2D matrix", () => {
  it("acsc([1,2;-1,1.4142]) → element-wise results", async () => {
    const r = await runPipeline(ctx("y = acsc([1,2;-1,1.4142])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.PI / 2, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(Math.PI / 6, 4);
    expect(r.solution.real["1-0"]).toBeCloseTo(-Math.PI / 2, 4);
    expect(r.solution.real["1-1"]).toBeCloseTo(Math.PI / 4, 3);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────
// acsc() receives the SI-converted numeric value. Input |v| must be >= 1.

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

describe("acsc — simple units (m): uses SI value", () => {
  it("v = 2 m → acsc(v) = π/6", async () => {
    const r = await solveWith("2", "m", "acsc(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(Math.PI / 6, 4);
  });

  it("v = 1 m → acsc(v) = π/2", async () => {
    const r = await solveWith("1", "m", "acsc(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(Math.PI / 2, 4);
  });
});

describe("acsc — converted units (ft): uses SI numeric value", () => {
  it("v = 4 ft → acsc(4 × 0.3048) = acsc(1.2192)", async () => {
    const r = await solveWith("4", "ft", "acsc(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(Math.asin(1 / (4 * FT_M)), 4);
  });
});
