/**
 * Tests for asinh() — solver/functions/trig/asinh.ts
 *
 * Formula: elementwise(args[0], Math.asinh)
 * Input domain: all reals. Inverse hyperbolic sine. Odd function.
 * asinh(x) = ln(x + √(x² + 1))
 *
 * Direct-call tests:
 *   - asinh(0) → 0
 *   - asinh(1) → ln(1+√2) ≈ 0.8814
 *   - asinh(-1) → -0.8814 (odd function)
 *   - asinh(sinh(2)) → 2
 *   - Row vector → element-wise inverse hyperbolic sines
 *   - 2D matrix → element-wise inverse hyperbolic sines
 *   - Empty matrix → empty
 *
 * Pipeline tests:
 *   - x = asinh(0) → 0
 *   - x = asinh(1) → 0.8814
 *   - x = asinh(-1) → -0.8814
 *   - Vector via documentEquations → element-wise results
 *   - Inline 2D matrix literal → element-wise results
 *
 * Unit tests:
 *   - asinh() receives the SI-converted numeric value of its argument
 *   - v = 1 m → SI = 1 → asinh(1)
 *   - v = 1 ft → SI = 0.3048 → asinh(0.3048)
 */

import { describe, it, expect } from "vitest";
import { asinh } from "../../functions/trig/asinh";
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

describe("asinh — direct call: scalars", () => {
  it("asinh(0) → 0", async () => {
    const r = await asinh([{ "0-0": 0 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });

  it("asinh(1) → ln(1+√2)", async () => {
    const r = await asinh([{ "0-0": 1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.asinh(1), 10);
  });

  it("asinh(-1) → -ln(1+√2) (odd function)", async () => {
    const r = await asinh([{ "0-0": -1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-Math.asinh(1), 10);
  });

  it("asinh(sinh(2)) → 2 (inverse property)", async () => {
    const r = await asinh([{ "0-0": Math.sinh(2) }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(2, 10);
  });

  it("asinh(0.5) → correct value", async () => {
    const r = await asinh([{ "0-0": 0.5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.asinh(0.5), 10);
  });
});

describe("asinh — direct call: vectors", () => {
  it("row vector [0, 1, -1] → [0, asinh(1), -asinh(1)]", async () => {
    const mat = { "0-0": 0, "0-1": 1, "0-2": -1 };
    const r = await asinh([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
    expect(r["0-1"]).toBeCloseTo(Math.asinh(1), 10);
    expect(r["0-2"]).toBeCloseTo(-Math.asinh(1), 10);
  });
});

describe("asinh — direct call: 2D matrix", () => {
  it("2x2 matrix → element-wise inverse hyperbolic sines", async () => {
    const mat = { "0-0": 0, "0-1": 1, "1-0": -1, "1-1": 2 };
    const r = await asinh([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
    expect(r["0-1"]).toBeCloseTo(Math.asinh(1), 10);
    expect(r["1-0"]).toBeCloseTo(Math.asinh(-1), 10);
    expect(r["1-1"]).toBeCloseTo(Math.asinh(2), 10);
  });
});

describe("asinh — direct call: edge cases", () => {
  it("empty matrix → empty result", async () => {
    const r = await asinh([{}], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(0);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("asinh — pipeline: scalars", () => {
  it("x = asinh(0) → 0", async () => {
    const r = await runPipeline(ctx("x = asinh(0)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });

  it("x = asinh(1) → 0.8814", async () => {
    const r = await runPipeline(ctx("x = asinh(1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.asinh(1), 4);
  });

  it("x = asinh(-1) → -0.8814", async () => {
    const r = await runPipeline(ctx("x = asinh(-1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(-Math.asinh(1), 4);
  });
});

describe("asinh — pipeline: vector via documentEquations", () => {
  it("asinh(v) on [0, 1, -1, 2] → element-wise results", async () => {
    const vals = [0, 1, -1, 2];
    const c = ctx("y = asinh(v)");
    c.documentEquations = [makeVec("v", vals, -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    vals.forEach((v, i) => {
      expect(r.solution.real[`0-${i}`]).toBeCloseTo(Math.asinh(v), 4);
    });
  });
});

describe("asinh — pipeline: inline 2D matrix", () => {
  it("asinh([0,1;-1,2]) → element-wise results", async () => {
    const r = await runPipeline(ctx("y = asinh([0,1;-1,2])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(Math.asinh(1), 4);
    expect(r.solution.real["1-0"]).toBeCloseTo(Math.asinh(-1), 4);
    expect(r.solution.real["1-1"]).toBeCloseTo(Math.asinh(2), 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────
// asinh() receives the SI-converted numeric value of its argument.

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

describe("asinh — simple units (m): uses SI value", () => {
  it("v = 1 m → asinh(v) = asinh(1)", async () => {
    const r = await solveWith("1", "m", "asinh(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(Math.asinh(1), 4);
  });

  it("v = 0 m → asinh(v) = 0", async () => {
    const r = await solveWith("0", "m", "asinh(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(0, 4);
  });
});

describe("asinh — converted units (ft): uses SI numeric value", () => {
  it("asinh(1ft) → asinh(0.3048)", async () => {
    const r = await runPipeline(ctx("x = asinh(1ft)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.asinh(FT_M), 4);
  });

  it("v = 1 ft → asinh(v) = asinh(0.3048)", async () => {
    const r = await solveWith("1", "ft", "asinh(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(Math.asinh(FT_M), 4);
  });
});
