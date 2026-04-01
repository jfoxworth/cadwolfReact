/**
 * Tests for asech() — solver/functions/trig/asech.ts
 *
 * Formula: elementwise(args[0], v => Math.log((1 + Math.sqrt(1 - v * v)) / v))
 * Input domain: (0, 1]. Returns values in [0, ∞) element-wise.
 * Inverse hyperbolic secant: asech(x) = acosh(1/x) = ln((1 + √(1-x²)) / x).
 *
 * Direct-call tests:
 *   - asech(1) → 0
 *   - asech(0.5) → ln(2 + √3) ≈ 1.3170
 *   - asech(sech(1)) → 1 (inverse property: sech(1) = 1/cosh(1))
 *   - Row vector (all in (0,1]) → element-wise results
 *   - 2D matrix → element-wise results
 *   - Empty matrix → empty
 *
 * Pipeline tests:
 *   - x = asech(1) → 0
 *   - x = asech(0.5) → 1.3170
 *   - Vector via documentEquations → element-wise results
 *   - Inline 2D matrix literal → element-wise results
 *
 * Unit tests:
 *   - asech() receives the SI-converted numeric value of its argument
 *   - Input SI value must be in (0, 1]
 *   - v = 0.5 m → SI = 0.5 → asech(0.5)
 *   - v = 1 ft → SI = 0.3048 → asech(0.3048)
 */

import { describe, it, expect } from "vitest";
import { asech } from "../../functions/trig/asech";
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

function asechFn(v: number) { return Math.log((1 + Math.sqrt(1 - v * v)) / v); }

// ── Direct call tests ──────────────────────────────────────────────────────────

describe("asech — direct call: scalars", () => {
  it("asech(1) → 0", async () => {
    const r = await asech([{ "0-0": 1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });

  it("asech(0.5) → ln(2+√3) ≈ 1.3170", async () => {
    const r = await asech([{ "0-0": 0.5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(asechFn(0.5), 10);
  });

  it("asech(1/cosh(1)) → 1 (inverse property)", async () => {
    const r = await asech([{ "0-0": 1 / Math.cosh(1) }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 8);
  });

  it("asech(0.8) → correct value", async () => {
    const r = await asech([{ "0-0": 0.8 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(asechFn(0.8), 10);
  });
});

describe("asech — direct call: vectors", () => {
  it("row vector [1, 0.5, 0.8] → element-wise results", async () => {
    const mat = { "0-0": 1, "0-1": 0.5, "0-2": 0.8 };
    const r = await asech([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
    expect(r["0-1"]).toBeCloseTo(asechFn(0.5), 10);
    expect(r["0-2"]).toBeCloseTo(asechFn(0.8), 10);
  });
});

describe("asech — direct call: 2D matrix", () => {
  it("2x2 matrix → element-wise results", async () => {
    const mat = { "0-0": 1, "0-1": 0.5, "1-0": 0.8, "1-1": 0.3 };
    const r = await asech([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
    expect(r["0-1"]).toBeCloseTo(asechFn(0.5), 10);
    expect(r["1-0"]).toBeCloseTo(asechFn(0.8), 10);
    expect(r["1-1"]).toBeCloseTo(asechFn(0.3), 10);
  });
});

describe("asech — direct call: edge cases", () => {
  it("empty matrix → empty result", async () => {
    const r = await asech([{}], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(0);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("asech — pipeline: scalars", () => {
  it("x = asech(1) → 0", async () => {
    const r = await runPipeline(ctx("x = asech(1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });

  it("x = asech(0.5) → 1.3170", async () => {
    const r = await runPipeline(ctx("x = asech(0.5)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(asechFn(0.5), 4);
  });

  it("x = asech(0.8) → correct value", async () => {
    const r = await runPipeline(ctx("x = asech(0.8)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(asechFn(0.8), 4);
  });
});

describe("asech — pipeline: vector via documentEquations", () => {
  it("asech(v) on [1, 0.5, 0.8] → element-wise results", async () => {
    const vals = [1, 0.5, 0.8];
    const c = ctx("y = asech(v)");
    c.documentEquations = [makeVec("v", vals, -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    vals.forEach((v, i) => {
      expect(r.solution.real[`0-${i}`]).toBeCloseTo(asechFn(v), 4);
    });
  });
});

describe("asech — pipeline: inline 2D matrix", () => {
  it("asech([1,0.5;0.8,0.3]) → element-wise results", async () => {
    const r = await runPipeline(ctx("y = asech([1,0.5;0.8,0.3])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(asechFn(0.5), 4);
    expect(r.solution.real["1-0"]).toBeCloseTo(asechFn(0.8), 4);
    expect(r.solution.real["1-1"]).toBeCloseTo(asechFn(0.3), 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────
// asech() receives the SI-converted numeric value. Input must be in (0, 1].

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

describe("asech — simple units (m): uses SI value", () => {
  it("v = 0.5 m → asech(v) = asech(0.5)", async () => {
    const r = await solveWith("0.5", "m", "asech(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(asechFn(0.5), 4);
  });

  it("v = 1 m → asech(v) = 0", async () => {
    const r = await solveWith("1", "m", "asech(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(0, 4);
  });
});

describe("asech — converted units (ft): uses SI numeric value", () => {
  it("asech(1ft) → asech(0.3048)  (0.3048 is in domain (0,1])", async () => {
    const r = await runPipeline(ctx("x = asech(1ft)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(asechFn(FT_M), 4);
  });

  it("v = 1 ft → asech(v) = asech(0.3048)", async () => {
    const r = await solveWith("1", "ft", "asech(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(asechFn(FT_M), 4);
  });
});
