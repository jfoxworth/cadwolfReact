/**
 * Tests for cosh() — solver/functions/trig/cosh.ts
 *
 * Formula: elementwise(args[0], Math.cosh)
 * Input domain: all reals. Returns values >= 1 element-wise.
 * cosh(x) = (e^x + e^(-x)) / 2. Even function: cosh(-x) = cosh(x).
 *
 * Direct-call tests:
 *   - cosh(0) → 1
 *   - cosh(1) → 1.5431
 *   - cosh(-1) → 1.5431 (even function)
 *   - cosh(2) → 3.7622
 *   - Row vector → element-wise hyperbolic cosines
 *   - 2D matrix → element-wise hyperbolic cosines
 *   - Empty matrix → empty
 *
 * Pipeline tests:
 *   - x = cosh(0) → 1
 *   - x = cosh(1) → 1.5431
 *   - x = cosh(-1) → 1.5431
 *   - Vector via documentEquations → element-wise hyperbolic cosines
 *   - Inline 2D matrix literal → element-wise hyperbolic cosines
 *
 * Unit tests:
 *   - cosh() receives the SI-converted numeric value of its argument
 *   - v = 1 m → SI = 1 → cosh(1)
 *   - v = 1 ft → SI = 0.3048 → cosh(0.3048)
 */

import { describe, it, expect } from "vitest";
import { cosh } from "../../functions/trig/cosh";
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

describe("cosh — direct call: scalars", () => {
  it("cosh(0) → 1", async () => {
    const r = await cosh([{ "0-0": 0 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
  });

  it("cosh(1) → 1.5431", async () => {
    const r = await cosh([{ "0-0": 1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.cosh(1), 10);
  });

  it("cosh(-1) → 1.5431 (even function)", async () => {
    const r = await cosh([{ "0-0": -1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.cosh(1), 10);
  });

  it("cosh(2) → 3.7622", async () => {
    const r = await cosh([{ "0-0": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.cosh(2), 10);
  });

  it("result is always >= 1", async () => {
    const r = await cosh([{ "0-0": 0.5 }], ctx("x=0"));
    expect(r["0-0"]).toBeGreaterThanOrEqual(1);
    expect(r["0-0"]).toBeCloseTo(Math.cosh(0.5), 10);
  });
});

describe("cosh — direct call: vectors", () => {
  it("row vector [0, 1, -1] → [1, cosh(1), cosh(1)]", async () => {
    const mat = { "0-0": 0, "0-1": 1, "0-2": -1 };
    const r = await cosh([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
    expect(r["0-1"]).toBeCloseTo(Math.cosh(1), 10);
    expect(r["0-2"]).toBeCloseTo(Math.cosh(1), 10);
  });
});

describe("cosh — direct call: 2D matrix", () => {
  it("2x2 matrix → element-wise hyperbolic cosines", async () => {
    const mat = { "0-0": 0, "0-1": 1, "1-0": -1, "1-1": 2 };
    const r = await cosh([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
    expect(r["0-1"]).toBeCloseTo(Math.cosh(1), 10);
    expect(r["1-0"]).toBeCloseTo(Math.cosh(1), 10);
    expect(r["1-1"]).toBeCloseTo(Math.cosh(2), 10);
  });
});

describe("cosh — direct call: edge cases", () => {
  it("empty matrix → empty result", async () => {
    const r = await cosh([{}], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(0);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("cosh — pipeline: scalars", () => {
  it("x = cosh(0) → 1", async () => {
    const r = await runPipeline(ctx("x = cosh(0)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
  });

  it("x = cosh(1) → 1.5431", async () => {
    const r = await runPipeline(ctx("x = cosh(1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.cosh(1), 4);
  });

  it("x = cosh(-1) → 1.5431 (even)", async () => {
    const r = await runPipeline(ctx("x = cosh(-1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.cosh(1), 4);
  });
});

describe("cosh — pipeline: vector via documentEquations", () => {
  it("cosh(v) on [0, 1, -1, 2] → element-wise hyperbolic cosines", async () => {
    const vals = [0, 1, -1, 2];
    const c = ctx("y = cosh(v)");
    c.documentEquations = [makeVec("v", vals, -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    vals.forEach((v, i) => {
      expect(r.solution.real[`0-${i}`]).toBeCloseTo(Math.cosh(v), 4);
    });
  });
});

describe("cosh — pipeline: inline 2D matrix", () => {
  it("cosh([0,1;-1,2]) → element-wise hyperbolic cosines", async () => {
    const r = await runPipeline(ctx("y = cosh([0,1;-1,2])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(Math.cosh(1), 4);
    expect(r.solution.real["1-0"]).toBeCloseTo(Math.cosh(1), 4);
    expect(r.solution.real["1-1"]).toBeCloseTo(Math.cosh(2), 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────
// cosh() receives the SI-converted numeric value of its argument.

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

describe("cosh — simple units (m): uses SI value", () => {
  it("v = 1 m → cosh(v) = cosh(1)", async () => {
    const r = await solveWith("1", "m", "cosh(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(Math.cosh(1), 4);
  });

  it("v = 0 m → cosh(v) = 1", async () => {
    const r = await solveWith("0", "m", "cosh(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(1, 4);
  });
});

describe("cosh — converted units (ft): uses SI numeric value", () => {
  it("cosh(1ft) → cosh(0.3048)", async () => {
    const r = await runPipeline(ctx("x = cosh(1ft)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.cosh(FT_M), 4);
  });

  it("v = 1 ft → cosh(v) = cosh(0.3048)", async () => {
    const r = await solveWith("1", "ft", "cosh(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(Math.cosh(FT_M), 4);
  });
});
