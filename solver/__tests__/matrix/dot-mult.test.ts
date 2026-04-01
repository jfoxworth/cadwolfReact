/**
 * Tests for dotMult() — solver/functions/matrix/dot-mult.ts
 *
 * Formula: Element-wise multiplication of two same-shape matrices.
 *   result[key] = mat1[key] * mat2[key]
 *
 * Direct-call tests:
 *   - [2,3] * [4,5] → [8,15]
 *   - 2D matrix element-wise multiplication
 *   - Scalar multiplication
 *
 * Pipeline tests:
 *   - dotMult([2,3], [4,5]) → [8,15]
 *
 * Unit tests:
 *   - dotMult() uses SI values
 *   - dotMult(3ft, 2) → result["0-0"] ≈ 3*FT_M*2
 */

import { describe, it, expect } from "vitest";
import { dotMult } from "../../functions/matrix/dot-mult";
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

describe("dotMult — direct call: row vectors", () => {
  it("[2,3] * [4,5] → [8,15]", async () => {
    const mat1 = { "0-0": 2, "0-1": 3 };
    const mat2 = { "0-0": 4, "0-1": 5 };
    const r = await dotMult([mat1, mat2], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(8, 10);
    expect(r["0-1"]).toBeCloseTo(15, 10);
  });

  it("[1,2,3] * [4,5,6] → [4,10,18]", async () => {
    const mat1 = { "0-0": 1, "0-1": 2, "0-2": 3 };
    const mat2 = { "0-0": 4, "0-1": 5, "0-2": 6 };
    const r = await dotMult([mat1, mat2], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(4, 10);
    expect(r["0-1"]).toBeCloseTo(10, 10);
    expect(r["0-2"]).toBeCloseTo(18, 10);
  });
});

describe("dotMult — direct call: scalar", () => {
  it("3 * 7 → 21", async () => {
    const r = await dotMult([{ "0-0": 3 }, { "0-0": 7 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(21, 10);
  });
});

describe("dotMult — direct call: 2D matrix", () => {
  it("[[1,2],[3,4]] * [[5,6],[7,8]] → [[5,12],[21,32]]", async () => {
    const mat1 = { "0-0": 1, "0-1": 2, "1-0": 3, "1-1": 4 };
    const mat2 = { "0-0": 5, "0-1": 6, "1-0": 7, "1-1": 8 };
    const r = await dotMult([mat1, mat2], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(5, 10);
    expect(r["0-1"]).toBeCloseTo(12, 10);
    expect(r["1-0"]).toBeCloseTo(21, 10);
    expect(r["1-1"]).toBeCloseTo(32, 10);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("dotMult — pipeline", () => {
  it("dotMult([2,3], [4,5]) → [8,15]", async () => {
    const r = await runPipeline(ctx("x = dotMult([2,3], [4,5])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(8, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(15, 4);
  });

  it("dotMult(3, 7) → 21", async () => {
    const r = await runPipeline(ctx("x = dotMult(3, 7)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(21, 4);
  });
});

describe("dotMult — pipeline: documentEquations vectors", () => {
  it("dotMult(u, v) where u=[2,3], v=[4,5] → [8,15]", async () => {
    const c = ctx("y = dotMult(u, v)");
    c.documentEquations = [
      makeVec("u", [2, 3], -2),
      makeVec("v", [4, 5], -1),
    ];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(8, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(15, 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────

describe("dotMult — unit tests: SI values used", () => {
  it("dotMult(3ft, 2) → result ≈ 3*FT_M*2", async () => {
    const r = await runPipeline(ctx("x = dotMult(3ft, 2)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(3 * FT_M * 2, 4);
  });

  it("v = 3 ft → dotMult(v, 2) ≈ 3*FT_M*2", async () => {
    const r = await solveWith("3", "ft", "dotMult(v, 2)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(3 * FT_M * 2, 4);
  });
});
