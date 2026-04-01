/**
 * Tests for diag() — solver/functions/matrix/diag.ts
 *
 * Dual-purpose function:
 *   - Vector (1×N) → creates diagonal square matrix of size (N+|offset|)×(N+|offset|)
 *   - Matrix (R×C) → extracts diagonal (or off-diagonal) as 1×(R-|offset|) row vector
 *
 * Direct-call tests:
 *   - Vector [1,2,3] → 3×3 diagonal matrix
 *   - Vector [1,2] with offset=1 → 3×3 superdiagonal matrix
 *   - 3×3 identity → extract diagonal [1,1,1]
 *   - 2×2 matrix → extract main diagonal [a,d]
 *
 * Pipeline tests:
 *   - diag([1,2,3]) → 3×3 diagonal
 *   - diag([1,2;3,4]) → extract [1,4] as row vector
 *
 * Unit tests:
 *   - diag([3ft]) → 1×1 diagonal matrix with SI value ≈ 3*FT_M
 */

import { describe, it, expect } from "vitest";
import { diag } from "../../functions/matrix/diag";
import { runPipeline } from "../../pipeline";
import { ctx } from "../helpers";
import { solveDocument } from "../../worker/document-solver";
import type { OrderedBlock } from "../../types";

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

describe("diag — direct call: vector → diagonal matrix", () => {
  it("[1,2,3] → 3×3 diagonal with 1,2,3 on main diagonal", async () => {
    const vec = { "0-0": 1, "0-1": 2, "0-2": 3 };
    const r = await diag([vec], ctx("x=0"));
    // Diagonal elements
    expect(r["0-0"]).toBeCloseTo(1, 10);
    expect(r["1-1"]).toBeCloseTo(2, 10);
    expect(r["2-2"]).toBeCloseTo(3, 10);
    // Off-diagonal should be 0
    expect(r["0-1"]).toBeCloseTo(0, 10);
    expect(r["1-0"]).toBeCloseTo(0, 10);
    expect(r["0-2"]).toBeCloseTo(0, 10);
    expect(r["2-0"]).toBeCloseTo(0, 10);
    expect(Object.keys(r)).toHaveLength(9);
  });

  it("[1,2] with offset=1 → 3×3 superdiagonal", async () => {
    const vec = { "0-0": 1, "0-1": 2 };
    const offset = { "0-0": 1 };
    const r = await diag([vec, offset], ctx("x=0"));
    // Superdiagonal: (0,1)=1, (1,2)=2
    expect(r["0-1"]).toBeCloseTo(1, 10);
    expect(r["1-2"]).toBeCloseTo(2, 10);
    // Main diagonal and lower diagonal should be 0
    expect(r["0-0"]).toBeCloseTo(0, 10);
    expect(r["1-1"]).toBeCloseTo(0, 10);
    expect(r["2-2"]).toBeCloseTo(0, 10);
    expect(Object.keys(r)).toHaveLength(9);
  });
});

describe("diag — direct call: matrix → extract diagonal", () => {
  it("3×3 identity → extract [1,1,1]", async () => {
    const identity = {
      "0-0": 1, "0-1": 0, "0-2": 0,
      "1-0": 0, "1-1": 1, "1-2": 0,
      "2-0": 0, "2-1": 0, "2-2": 1,
    };
    const r = await diag([identity], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
    expect(r["0-1"]).toBeCloseTo(1, 10);
    expect(r["0-2"]).toBeCloseTo(1, 10);
    expect(Object.keys(r)).toHaveLength(3);
  });

  it("[[1,2],[3,4]] → extract [1,4]", async () => {
    const mat = { "0-0": 1, "0-1": 2, "1-0": 3, "1-1": 4 };
    const r = await diag([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
    expect(r["0-1"]).toBeCloseTo(4, 10);
    expect(Object.keys(r)).toHaveLength(2);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("diag — pipeline: vector to diagonal matrix", () => {
  it("diag([1,2,3]) → 3×3 diagonal", async () => {
    const r = await runPipeline(ctx("x = diag([1,2,3])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
    expect(r.solution.real["1-1"]).toBeCloseTo(2, 4);
    expect(r.solution.real["2-2"]).toBeCloseTo(3, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(0, 4);
  });
});

describe("diag — pipeline: matrix to diagonal vector", () => {
  it("diag([1,2;3,4]) → row vector [1,4]", async () => {
    const r = await runPipeline(ctx("x = diag([1,2;3,4])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(4, 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────

describe("diag — unit tests: SI values used", () => {
  it("diag([3ft]) → 1×1 diagonal, element ≈ 3*FT_M", async () => {
    const r = await runPipeline(ctx("x = diag([3ft])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(3 * FT_M, 4);
  });

  it("v = 3 ft → diag([v]) → element ≈ 3*FT_M", async () => {
    const r = await solveWith("3", "ft", "diag([v])");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(3 * FT_M, 4);
  });
});
