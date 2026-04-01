/**
 * Tests for atanh() — solver/functions/trig/atanh.ts
 *
 * Formula: elementwise(args[0], Math.atanh)
 * Input domain: (-1, 1) exclusive. Returns all reals element-wise.
 * atanh(x) = 0.5 × ln((1+x)/(1-x)). Odd function.
 *
 * Direct-call tests:
 *   - atanh(0) → 0
 *   - atanh(0.5) → 0.5493
 *   - atanh(-0.5) → -0.5493 (odd function)
 *   - atanh(tanh(1)) → 1 (inverse property)
 *   - Row vector (all in (-1,1)) → element-wise results
 *   - 2D matrix → element-wise results
 *   - Empty matrix → empty
 *
 * Pipeline tests:
 *   - x = atanh(0) → 0
 *   - x = atanh(0.5) → 0.5493
 *   - x = atanh(-0.5) → -0.5493
 *   - Vector via documentEquations → element-wise results
 *   - Inline 2D matrix literal → element-wise results
 *
 * Unit tests:
 *   - atanh() receives the SI-converted numeric value of its argument
 *   - Input SI value must be in (-1, 1)
 *   - v = 0.5 m → SI = 0.5 → atanh(0.5)
 *   - v = 1 ft → SI = 0.3048 → atanh(0.3048)
 */

import { describe, it, expect } from "vitest";
import { atanh } from "../../functions/trig/atanh";
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

describe("atanh — direct call: scalars", () => {
  it("atanh(0) → 0", async () => {
    const r = await atanh([{ "0-0": 0 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });

  it("atanh(0.5) → 0.5493", async () => {
    const r = await atanh([{ "0-0": 0.5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.atanh(0.5), 10);
  });

  it("atanh(-0.5) → -0.5493 (odd function)", async () => {
    const r = await atanh([{ "0-0": -0.5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-Math.atanh(0.5), 10);
  });

  it("atanh(tanh(1)) → 1 (inverse property)", async () => {
    const r = await atanh([{ "0-0": Math.tanh(1) }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
  });

  it("atanh(0.9) → correct value", async () => {
    const r = await atanh([{ "0-0": 0.9 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.atanh(0.9), 10);
  });
});

describe("atanh — direct call: vectors", () => {
  it("row vector [0, 0.5, -0.5] → [0, atanh(0.5), -atanh(0.5)]", async () => {
    const mat = { "0-0": 0, "0-1": 0.5, "0-2": -0.5 };
    const r = await atanh([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
    expect(r["0-1"]).toBeCloseTo(Math.atanh(0.5), 10);
    expect(r["0-2"]).toBeCloseTo(-Math.atanh(0.5), 10);
  });
});

describe("atanh — direct call: 2D matrix", () => {
  it("2x2 matrix → element-wise results", async () => {
    const mat = { "0-0": 0, "0-1": 0.5, "1-0": -0.5, "1-1": 0.9 };
    const r = await atanh([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
    expect(r["0-1"]).toBeCloseTo(Math.atanh(0.5), 10);
    expect(r["1-0"]).toBeCloseTo(Math.atanh(-0.5), 10);
    expect(r["1-1"]).toBeCloseTo(Math.atanh(0.9), 10);
  });
});

describe("atanh — direct call: edge cases", () => {
  it("empty matrix → empty result", async () => {
    const r = await atanh([{}], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(0);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("atanh — pipeline: scalars", () => {
  it("x = atanh(0) → 0", async () => {
    const r = await runPipeline(ctx("x = atanh(0)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });

  it("x = atanh(0.5) → 0.5493", async () => {
    const r = await runPipeline(ctx("x = atanh(0.5)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.atanh(0.5), 4);
  });

  it("x = atanh(-0.5) → -0.5493", async () => {
    const r = await runPipeline(ctx("x = atanh(-0.5)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(-Math.atanh(0.5), 4);
  });
});

describe("atanh — pipeline: vector via documentEquations", () => {
  it("atanh(v) on [0, 0.5, -0.5, 0.9] → element-wise results", async () => {
    const vals = [0, 0.5, -0.5, 0.9];
    const c = ctx("y = atanh(v)");
    c.documentEquations = [makeVec("v", vals, -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    vals.forEach((v, i) => {
      expect(r.solution.real[`0-${i}`]).toBeCloseTo(Math.atanh(v), 4);
    });
  });
});

describe("atanh — pipeline: inline 2D matrix", () => {
  it("atanh([0,0.5;-0.5,0.9]) → element-wise results", async () => {
    const r = await runPipeline(ctx("y = atanh([0,0.5;-0.5,0.9])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(Math.atanh(0.5), 4);
    expect(r.solution.real["1-0"]).toBeCloseTo(Math.atanh(-0.5), 4);
    expect(r.solution.real["1-1"]).toBeCloseTo(Math.atanh(0.9), 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────
// atanh() receives the SI-converted numeric value. Input must be in (-1, 1).

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

describe("atanh — simple units (m): uses SI value", () => {
  it("v = 0.5 m → atanh(v) = atanh(0.5)", async () => {
    const r = await solveWith("0.5", "m", "atanh(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(Math.atanh(0.5), 4);
  });

  it("v = 0 m → atanh(v) = 0", async () => {
    const r = await solveWith("0", "m", "atanh(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(0, 4);
  });
});

describe("atanh — converted units (ft): uses SI numeric value", () => {
  it("atanh(1ft) → atanh(0.3048)  (0.3048 is in domain (-1,1))", async () => {
    const r = await runPipeline(ctx("x = atanh(1ft)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.atanh(FT_M), 4);
  });

  it("v = 1 ft → atanh(v) = atanh(0.3048)", async () => {
    const r = await solveWith("1", "ft", "atanh(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(Math.atanh(FT_M), 4);
  });
});
