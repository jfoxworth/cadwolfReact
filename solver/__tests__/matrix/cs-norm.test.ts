/**
 * Tests for csNorm() — solver/functions/matrix/cs-norm.ts
 *
 * Formula: Column-sum norm (max over columns of sum of |absolute values| in that column).
 *   result = max_b ( Σ_a |mat[a-b]| )
 *
 * Direct-call tests:
 *   - Scalar → same absolute value
 *   - [3,-4] (row vector, two single-element columns) → max(3,4)=4
 *   - [[1,2],[3,4]] → max(1+3, 2+4) = max(4,6) = 6
 *   - Negative values → uses absolute values
 *
 * Pipeline tests:
 *   - csNorm([3,4]) → 4 (max of two single-element columns)
 *   - csNorm([1,2;3,4]) → 6
 *
 * Unit tests:
 *   - csNorm() uses SI values
 *   - csNorm(3ft) → 3*FT_M
 */

import { describe, it, expect } from "vitest";
import { csNorm } from "../../functions/matrix/cs-norm";
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

describe("csNorm — direct call: scalar", () => {
  it("scalar 5 → 5", async () => {
    const r = await csNorm([{ "0-0": 5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(5, 10);
  });

  it("scalar -7 → 7 (absolute value)", async () => {
    const r = await csNorm([{ "0-0": -7 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(7, 10);
  });
});

describe("csNorm — direct call: row vector", () => {
  it("[3,-4] → max(3,4) = 4", async () => {
    const r = await csNorm([{ "0-0": 3, "0-1": -4 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(4, 10);
  });

  it("[5,2,8] → max(5,2,8) = 8", async () => {
    const r = await csNorm([{ "0-0": 5, "0-1": 2, "0-2": 8 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(8, 10);
  });
});

describe("csNorm — direct call: 2D matrix", () => {
  it("[[1,2],[3,4]] → max(1+3, 2+4) = 6", async () => {
    const mat = { "0-0": 1, "0-1": 2, "1-0": 3, "1-1": 4 };
    const r = await csNorm([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(6, 10);
  });

  it("[[5,1],[2,1]] → max(5+2, 1+1) = 7", async () => {
    const mat = { "0-0": 5, "0-1": 1, "1-0": 2, "1-1": 1 };
    const r = await csNorm([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(7, 10);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("csNorm — pipeline", () => {
  it("csNorm([3,4]) → 4", async () => {
    const r = await runPipeline(ctx("x = csNorm([3,4])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(4, 4);
  });

  it("csNorm([1,2;3,4]) → 6", async () => {
    const r = await runPipeline(ctx("x = csNorm([1,2;3,4])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(6, 4);
  });

  it("csNorm(5) → 5", async () => {
    const r = await runPipeline(ctx("x = csNorm(5)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(5, 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────

describe("csNorm — unit tests: SI values used", () => {
  it("csNorm(3ft) → 3*FT_M", async () => {
    const r = await runPipeline(ctx("x = csNorm(3ft)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(3 * FT_M, 4);
  });

  it("v = 3 ft → csNorm(v) ≈ 3*FT_M", async () => {
    const r = await solveWith("3", "ft", "csNorm(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(3 * FT_M, 4);
  });
});
