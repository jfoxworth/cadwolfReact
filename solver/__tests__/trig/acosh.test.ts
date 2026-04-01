/**
 * Tests for acosh() — solver/functions/trig/acosh.ts
 *
 * Formula: elementwise(args[0], Math.acosh)
 * Input domain: [1, ∞). Returns values in [0, ∞) element-wise.
 * acosh(x) = ln(x + √(x² - 1))
 *
 * Direct-call tests:
 *   - acosh(1) → 0
 *   - acosh(2) → 1.3170
 *   - acosh(cosh(2)) → 2 (inverse property)
 *   - acosh(1.5) → correct value
 *   - Row vector (all >= 1) → element-wise inverse hyperbolic cosines
 *   - 2D matrix (all >= 1) → element-wise results
 *   - Empty matrix → empty
 *
 * Pipeline tests:
 *   - x = acosh(1) → 0
 *   - x = acosh(2) → 1.3170
 *   - Vector via documentEquations → element-wise results
 *   - Inline 2D matrix literal → element-wise results
 *
 * Unit tests:
 *   - acosh() receives the SI-converted numeric value of its argument
 *   - Input SI value must be >= 1
 *   - v = 2 m → SI = 2 → acosh(2)
 *   - v = 4 ft → SI = 4×0.3048 = 1.2192 → acosh(1.2192)
 */

import { describe, it, expect } from "vitest";
import { acosh } from "../../functions/trig/acosh";
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

describe("acosh — direct call: scalars", () => {
  it("acosh(1) → 0", async () => {
    const r = await acosh([{ "0-0": 1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });

  it("acosh(2) → 1.3170", async () => {
    const r = await acosh([{ "0-0": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.acosh(2), 10);
  });

  it("acosh(cosh(2)) → 2 (inverse property)", async () => {
    const r = await acosh([{ "0-0": Math.cosh(2) }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(2, 10);
  });

  it("acosh(1.5) → correct value", async () => {
    const r = await acosh([{ "0-0": 1.5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.acosh(1.5), 10);
  });

  it("acosh(10) → correct value", async () => {
    const r = await acosh([{ "0-0": 10 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.acosh(10), 10);
  });
});

describe("acosh — direct call: vectors", () => {
  it("row vector [1, 2, 1.5] → element-wise results", async () => {
    const mat = { "0-0": 1, "0-1": 2, "0-2": 1.5 };
    const r = await acosh([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
    expect(r["0-1"]).toBeCloseTo(Math.acosh(2), 10);
    expect(r["0-2"]).toBeCloseTo(Math.acosh(1.5), 10);
  });
});

describe("acosh — direct call: 2D matrix", () => {
  it("2x2 matrix → element-wise inverse hyperbolic cosines", async () => {
    const mat = { "0-0": 1, "0-1": 2, "1-0": 1.5, "1-1": 3 };
    const r = await acosh([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
    expect(r["0-1"]).toBeCloseTo(Math.acosh(2), 10);
    expect(r["1-0"]).toBeCloseTo(Math.acosh(1.5), 10);
    expect(r["1-1"]).toBeCloseTo(Math.acosh(3), 10);
  });
});

describe("acosh — direct call: edge cases", () => {
  it("empty matrix → empty result", async () => {
    const r = await acosh([{}], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(0);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("acosh — pipeline: scalars", () => {
  it("x = acosh(1) → 0", async () => {
    const r = await runPipeline(ctx("x = acosh(1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });

  it("x = acosh(2) → 1.3170", async () => {
    const r = await runPipeline(ctx("x = acosh(2)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.acosh(2), 4);
  });

  it("x = acosh(1.5) → correct value", async () => {
    const r = await runPipeline(ctx("x = acosh(1.5)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.acosh(1.5), 4);
  });
});

describe("acosh — pipeline: vector via documentEquations", () => {
  it("acosh(v) on [1, 2, 1.5, 3] → element-wise results", async () => {
    const vals = [1, 2, 1.5, 3];
    const c = ctx("y = acosh(v)");
    c.documentEquations = [makeVec("v", vals, -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    vals.forEach((v, i) => {
      expect(r.solution.real[`0-${i}`]).toBeCloseTo(Math.acosh(v), 4);
    });
  });
});

describe("acosh — pipeline: inline 2D matrix", () => {
  it("acosh([1,2;1.5,3]) → element-wise results", async () => {
    const r = await runPipeline(ctx("y = acosh([1,2;1.5,3])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(Math.acosh(2), 4);
    expect(r.solution.real["1-0"]).toBeCloseTo(Math.acosh(1.5), 4);
    expect(r.solution.real["1-1"]).toBeCloseTo(Math.acosh(3), 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────
// acosh() receives the SI-converted numeric value. Input must be >= 1.

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

describe("acosh — simple units (m): uses SI value", () => {
  it("v = 2 m → acosh(v) = acosh(2)", async () => {
    const r = await solveWith("2", "m", "acosh(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(Math.acosh(2), 4);
  });

  it("v = 1 m → acosh(v) = 0", async () => {
    const r = await solveWith("1", "m", "acosh(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(0, 4);
  });
});

describe("acosh — converted units (ft): uses SI numeric value", () => {
  it("v = 4 ft → acosh(4 × 0.3048) = acosh(1.2192)", async () => {
    // 4 ft = 4 × 0.3048 = 1.2192 m — within domain >= 1
    const r = await solveWith("4", "ft", "acosh(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(Math.acosh(4 * FT_M), 4);
  });
});
