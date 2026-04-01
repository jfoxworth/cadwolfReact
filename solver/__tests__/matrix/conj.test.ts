/**
 * Tests for conj() — solver/functions/matrix/conj.ts
 *
 * Formula: pass-through — copies every element unchanged (real-only pipeline).
 * Since the pipeline works with real numbers only, conj is effectively an identity
 * function: imaginary parts are always 0, so negating them changes nothing.
 *
 * Direct-call tests:
 *   - Scalar → same value
 *   - Row vector → same values
 *   - 2D matrix → same values
 *
 * Pipeline tests:
 *   - conj(5) → 5
 *   - conj([1,2,3]) → [1,2,3]
 *
 * Unit tests:
 *   - conj() passes SI-converted values through unchanged
 *   - conj(3ft) → output["0-0"] ≈ 3*FT_M
 */

import { describe, it, expect } from "vitest";
import { conj } from "../../functions/matrix/conj";
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

async function solveWith(varVal: string, varUnit: string, fnExpr: string) {
  const blocks: OrderedBlock[] = [
    { id: "vb", order: 1, type: "EQUATION", definition: { raw: `v = ${varVal}`, variableName: "v", unit: varUnit } },
    { id: "xb", order: 2, type: "EQUATION", definition: { raw: `x = ${fnExpr}`, variableName: "x", unit: "" } },
  ];
  const r1 = await solveDocument(blocks, "vb", []);
  const r2 = await solveDocument(blocks, "xb", r1.resolvedMap);
  return r2.results.find((r) => r.blockId === "xb")!;
}

const FT_M = 0.3048;

// ── Direct call tests ──────────────────────────────────────────────────────────

describe("conj — direct call: scalar", () => {
  it("scalar 5 → 5", async () => {
    const r = await conj([{ "0-0": 5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(5, 10);
  });

  it("scalar -3 → -3", async () => {
    const r = await conj([{ "0-0": -3 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-3, 10);
  });

  it("scalar 0 → 0", async () => {
    const r = await conj([{ "0-0": 0 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });
});

describe("conj — direct call: row vector", () => {
  it("[1,2,3] → [1,2,3]", async () => {
    const r = await conj([{ "0-0": 1, "0-1": 2, "0-2": 3 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
    expect(r["0-1"]).toBeCloseTo(2, 10);
    expect(r["0-2"]).toBeCloseTo(3, 10);
    expect(Object.keys(r)).toHaveLength(3);
  });

  it("[-1,0,1] → [-1,0,1]", async () => {
    const r = await conj([{ "0-0": -1, "0-1": 0, "0-2": 1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-1, 10);
    expect(r["0-1"]).toBeCloseTo(0, 10);
    expect(r["0-2"]).toBeCloseTo(1, 10);
  });
});

describe("conj — direct call: 2D matrix", () => {
  it("2×2 [[1,2],[3,4]] → same values", async () => {
    const mat = { "0-0": 1, "0-1": 2, "1-0": 3, "1-1": 4 };
    const r = await conj([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
    expect(r["0-1"]).toBeCloseTo(2, 10);
    expect(r["1-0"]).toBeCloseTo(3, 10);
    expect(r["1-1"]).toBeCloseTo(4, 10);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("conj — pipeline: scalars", () => {
  it("x = conj(5) → 5", async () => {
    const r = await runPipeline(ctx("x = conj(5)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(5, 4);
  });

  it("x = conj(-3) → -3", async () => {
    const r = await runPipeline(ctx("x = conj(-3)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(-3, 4);
  });
});

describe("conj — pipeline: row vector via documentEquations", () => {
  it("conj(v) on [1,2,3] → [1,2,3]", async () => {
    const c = ctx("y = conj(v)");
    c.documentEquations = [makeVec("v", [1, 2, 3], -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(2, 4);
    expect(r.solution.real["0-2"]).toBeCloseTo(3, 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────

describe("conj — unit tests: SI value passes through unchanged", () => {
  it("conj(3ft) → 3*FT_M", async () => {
    const r = await runPipeline(ctx("x = conj(3ft)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(3 * FT_M, 4);
  });

  it("v = 3 ft → conj(v) ≈ 3*FT_M", async () => {
    const r = await solveWith("3", "ft", "conj(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(3 * FT_M, 4);
  });
});
