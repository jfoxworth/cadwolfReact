/**
 * Tests for dot() — solver/functions/matrix/dot.ts
 *
 * Formula: Dot product summed along a dimension.
 *   dim=0: for each row a, result["a-0"] = Σ_b mat1["a-b"] * mat2["a-b"]
 *   dim=1: for each col b, result["0-b"] = Σ_a mat1["a-b"] * mat2["a-b"]
 *
 * Direct-call tests:
 *   - 2×2 matrices dim=0 → column result vector [1*5+2*6, 3*7+4*8] = [17,53]
 *   - 2×2 matrices dim=1 → row result vector [1*5+3*7, 2*6+4*8] = [26,44]
 *   - Row vectors dim=0 → single value [1*4+2*5+3*6] = [32]
 *
 * Pipeline tests:
 *   - dot([1,2,3], [4,5,6], 0) → "0-0" = 32
 *
 * Unit tests:
 *   - dot() uses SI values
 *   - dot([3ft], [2], 0) → "0-0" ≈ 3*FT_M*2
 */

import { describe, it, expect } from "vitest";
import { dot } from "../../functions/matrix/dot";
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

describe("dot — direct call: 2×2 matrices dim=0", () => {
  it("[[1,2],[3,4]] . [[5,6],[7,8]] dim=0 → column result [17, 53]", async () => {
    const mat1 = { "0-0": 1, "0-1": 2, "1-0": 3, "1-1": 4 };
    const mat2 = { "0-0": 5, "0-1": 6, "1-0": 7, "1-1": 8 };
    const dim  = { "0-0": 0 };
    const r = await dot([mat1, mat2, dim], ctx("x=0"));
    // row 0: 1*5 + 2*6 = 5 + 12 = 17
    expect(r["0-0"]).toBeCloseTo(17, 10);
    // row 1: 3*7 + 4*8 = 21 + 32 = 53
    expect(r["1-0"]).toBeCloseTo(53, 10);
  });
});

describe("dot — direct call: 2×2 matrices dim=1", () => {
  it("[[1,2],[3,4]] . [[5,6],[7,8]] dim=1 → row result [26, 44]", async () => {
    const mat1 = { "0-0": 1, "0-1": 2, "1-0": 3, "1-1": 4 };
    const mat2 = { "0-0": 5, "0-1": 6, "1-0": 7, "1-1": 8 };
    const dim  = { "0-0": 1 };
    const r = await dot([mat1, mat2, dim], ctx("x=0"));
    // col 0: 1*5 + 3*7 = 5 + 21 = 26
    expect(r["0-0"]).toBeCloseTo(26, 10);
    // col 1: 2*6 + 4*8 = 12 + 32 = 44
    expect(r["0-1"]).toBeCloseTo(44, 10);
  });
});

describe("dot — direct call: row vectors dim=0", () => {
  it("[1,2,3] . [4,5,6] dim=0 → single value 32", async () => {
    const mat1 = { "0-0": 1, "0-1": 2, "0-2": 3 };
    const mat2 = { "0-0": 4, "0-1": 5, "0-2": 6 };
    const dim  = { "0-0": 0 };
    const r = await dot([mat1, mat2, dim], ctx("x=0"));
    // 1*4 + 2*5 + 3*6 = 4 + 10 + 18 = 32
    expect(r["0-0"]).toBeCloseTo(32, 10);
  });
});

describe("dot — direct call: default dim=0", () => {
  it("[2,3] . [4,5] (no dim) → 8+15 = 23", async () => {
    const mat1 = { "0-0": 2, "0-1": 3 };
    const mat2 = { "0-0": 4, "0-1": 5 };
    const r = await dot([mat1, mat2], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(23, 10);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("dot — pipeline", () => {
  it("dot([1,2,3], [4,5,6], 0) → 32", async () => {
    const r = await runPipeline(ctx("x = dot([1,2,3], [4,5,6], 0)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(32, 4);
  });

  it("dot([2,3], [4,5], 1) → [8,15] (col-wise)", async () => {
    const r = await runPipeline(ctx("x = dot([2,3], [4,5], 1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(8, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(15, 4);
  });
});

describe("dot — pipeline: documentEquations vectors", () => {
  it("dot(u, v, 0) where u=[1,2,3], v=[4,5,6] → 32", async () => {
    const c = ctx("y = dot(u, v, 0)");
    c.documentEquations = [
      makeVec("u", [1, 2, 3], -2),
      makeVec("v", [4, 5, 6], -1),
    ];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(32, 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────

describe("dot — unit tests: SI values used", () => {
  it("dot([3ft], [2], 0) → 0-0 ≈ 3*FT_M*2", async () => {
    const r = await runPipeline(ctx("x = dot([3ft], [2], 0)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(3 * FT_M * 2, 4);
  });

  it("v = 3 ft → dot([v], [2], 0) ≈ 3*FT_M*2", async () => {
    const r = await solveWith("3", "ft", "dot([v], [2], 0)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(3 * FT_M * 2, 4);
  });
});
