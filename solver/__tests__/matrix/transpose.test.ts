/**
 * Tests for transpose() — solver/functions/matrix/transpose.ts
 *
 * Formula: Swap row and column indices.
 *   result["col-row"] = mat["row-col"]
 *   N×M input becomes M×N output.
 *
 * Direct-call tests:
 *   - Row vector [1,2,3] → column vector [1;2;3]
 *   - 2×3 matrix → 3×2 matrix
 *   - Scalar → scalar (unchanged)
 *
 * Pipeline tests:
 *   - transpose([1,2,3]) → "0-0"=1, "1-0"=2, "2-0"=3
 *
 * Unit tests:
 *   - transpose() passes SI values through unchanged (just swaps indices)
 *   - transpose([3ft]) → "0-0" ≈ 3*FT_M
 */

import { describe, it, expect } from "vitest";
import { transpose } from "../../functions/matrix/transpose";
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

describe("transpose — direct call: row vector → column vector", () => {
  it("[1,2,3] (1×3) → [1;2;3] (3×1)", async () => {
    const r = await transpose([{ "0-0": 1, "0-1": 2, "0-2": 3 }], ctx("x=0"));
    // Row i becomes column i: "0-i" → "i-0"
    expect(r["0-0"]).toBeCloseTo(1, 10);
    expect(r["1-0"]).toBeCloseTo(2, 10);
    expect(r["2-0"]).toBeCloseTo(3, 10);
    expect(Object.keys(r)).toHaveLength(3);
  });

  it("[5,10] (1×2) → [5;10] (2×1)", async () => {
    const r = await transpose([{ "0-0": 5, "0-1": 10 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(5, 10);
    expect(r["1-0"]).toBeCloseTo(10, 10);
  });
});

describe("transpose — direct call: 2D matrix", () => {
  it("[[1,2,3],[4,5,6]] (2×3) → (3×2)", async () => {
    const mat = { "0-0": 1, "0-1": 2, "0-2": 3, "1-0": 4, "1-1": 5, "1-2": 6 };
    const r = await transpose([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
    expect(r["1-0"]).toBeCloseTo(2, 10);
    expect(r["2-0"]).toBeCloseTo(3, 10);
    expect(r["0-1"]).toBeCloseTo(4, 10);
    expect(r["1-1"]).toBeCloseTo(5, 10);
    expect(r["2-1"]).toBeCloseTo(6, 10);
    expect(Object.keys(r)).toHaveLength(6);
  });
});

describe("transpose — direct call: scalar", () => {
  it("scalar 7 → 7 (unchanged)", async () => {
    const r = await transpose([{ "0-0": 7 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(7, 10);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("transpose — pipeline", () => {
  it("transpose([1,2,3]) → column vector: 0-0=1, 1-0=2, 2-0=3", async () => {
    const r = await runPipeline(ctx("x = transpose([1,2,3])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
    expect(r.solution.real["1-0"]).toBeCloseTo(2, 4);
    expect(r.solution.real["2-0"]).toBeCloseTo(3, 4);
  });

  it("transpose([1,2;3,4]) → 2×2 transposed", async () => {
    const r = await runPipeline(ctx("x = transpose([1,2;3,4])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
    expect(r.solution.real["1-0"]).toBeCloseTo(2, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(3, 4);
    expect(r.solution.real["1-1"]).toBeCloseTo(4, 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────

describe("transpose — unit tests: SI values preserved through index swap", () => {
  it("transpose([3ft]) → 0-0 ≈ 3*FT_M", async () => {
    const r = await runPipeline(ctx("x = transpose([3ft])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(3 * FT_M, 4);
  });

  it("v = 3 ft → transpose([v]) → 0-0 ≈ 3*FT_M", async () => {
    const r = await solveWith("3", "ft", "transpose([v])");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(3 * FT_M, 4);
  });

  it("transpose([3ft,6ft]) → column vector with SI values", async () => {
    const r = await runPipeline(ctx("x = transpose([3ft,6ft])"));
    expect(r.errors).toHaveLength(0);
    // [3ft, 6ft] transposed: "0-0"→3*FT_M, "1-0"→6*FT_M
    expect(r.solution.real["0-0"]).toBeCloseTo(3 * FT_M, 4);
    expect(r.solution.real["1-0"]).toBeCloseTo(6 * FT_M, 4);
  });
});
