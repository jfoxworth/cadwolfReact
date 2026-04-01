/**
 * Tests for dotDiv() — solver/functions/matrix/dot-div.ts
 *
 * Formula: Element-wise division of two same-shape matrices.
 *   result[key] = mat1[key] / mat2[key]
 *
 * Direct-call tests:
 *   - [10,20] / [2,5] → [5,4]
 *   - 2D matrix element-wise division
 *   - Scalar division
 *
 * Pipeline tests:
 *   - dotDiv([10,20], [2,5]) → [5,4]
 *
 * Unit tests:
 *   - dotDiv uses SI values
 *   - dotDiv(6ft, 2) → result["0-0"] ≈ 6*FT_M/2 = 3*FT_M
 */

import { describe, it, expect } from "vitest";
import { dotDiv } from "../../functions/matrix/dot-div";
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

describe("dotDiv — direct call: row vectors", () => {
  it("[10,20] / [2,5] → [5,4]", async () => {
    const mat1 = { "0-0": 10, "0-1": 20 };
    const mat2 = { "0-0": 2,  "0-1": 5 };
    const r = await dotDiv([mat1, mat2], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(5, 10);
    expect(r["0-1"]).toBeCloseTo(4, 10);
  });

  it("[6,9] / [3,3] → [2,3]", async () => {
    const mat1 = { "0-0": 6, "0-1": 9 };
    const mat2 = { "0-0": 3, "0-1": 3 };
    const r = await dotDiv([mat1, mat2], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(2, 10);
    expect(r["0-1"]).toBeCloseTo(3, 10);
  });
});

describe("dotDiv — direct call: scalar", () => {
  it("12 / 4 → 3", async () => {
    const r = await dotDiv([{ "0-0": 12 }, { "0-0": 4 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(3, 10);
  });
});

describe("dotDiv — direct call: 2D matrix", () => {
  it("[[10,20],[30,40]] / [[2,4],[5,8]] → [[5,5],[6,5]]", async () => {
    const mat1 = { "0-0": 10, "0-1": 20, "1-0": 30, "1-1": 40 };
    const mat2 = { "0-0": 2,  "0-1": 4,  "1-0": 5,  "1-1": 8 };
    const r = await dotDiv([mat1, mat2], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(5, 10);
    expect(r["0-1"]).toBeCloseTo(5, 10);
    expect(r["1-0"]).toBeCloseTo(6, 10);
    expect(r["1-1"]).toBeCloseTo(5, 10);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("dotDiv — pipeline", () => {
  it("dotDiv([10,20], [2,5]) → [5,4]", async () => {
    const r = await runPipeline(ctx("x = dotDiv([10,20], [2,5])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(5, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(4, 4);
  });

  it("dotDiv(12, 4) → 3", async () => {
    const r = await runPipeline(ctx("x = dotDiv(12, 4)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(3, 4);
  });
});

describe("dotDiv — pipeline: documentEquations vectors", () => {
  it("dotDiv(u, v) where u=[6,9], v=[3,3] → [2,3]", async () => {
    const c = ctx("y = dotDiv(u, v)");
    c.documentEquations = [
      makeVec("u", [6, 9], -2),
      makeVec("v", [3, 3], -1),
    ];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(2, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(3, 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────

describe("dotDiv — unit tests: SI values used", () => {
  it("dotDiv(6ft, 2) → result ≈ 6*FT_M/2", async () => {
    const r = await runPipeline(ctx("x = dotDiv(6ft, 2)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(6 * FT_M / 2, 4);
  });

  it("v = 6 ft → dotDiv(v, 2) ≈ 6*FT_M/2", async () => {
    const r = await solveWith("6", "ft", "dotDiv(v, 2)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(6 * FT_M / 2, 4);
  });
});
