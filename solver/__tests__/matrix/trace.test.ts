/**
 * Tests for trace() — solver/functions/matrix/trace.ts
 *
 * Formula: Sum of main diagonal elements.
 *   result = Σ_a mat[a-a]  (for a from 0 to maxRow)
 *
 * Direct-call tests:
 *   - 2×2 [[1,2],[3,4]] → 1+4 = 5
 *   - 3×3 identity → 3
 *   - 1×1 scalar → value itself
 *   - Non-square 3×2 → sums as many diagonal entries as possible
 *
 * Pipeline tests:
 *   - trace([1,2;3,4]) → 5
 *   - trace([1,2;3,4;5,6]) → 1+4 = 5 (missing "2-2" → 0)
 *
 * Unit tests:
 *   - trace() uses SI values
 *   - trace([3ft]) → 3*FT_M (single-element, diagonal is that element)
 */

import { describe, it, expect } from "vitest";
import { trace } from "../../functions/matrix/trace";
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

describe("trace — direct call: 2×2 matrix", () => {
  it("[[1,2],[3,4]] → 1+4 = 5", async () => {
    const mat = { "0-0": 1, "0-1": 2, "1-0": 3, "1-1": 4 };
    const r = await trace([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(5, 10);
  });

  it("[[7,2],[5,3]] → 7+3 = 10", async () => {
    const mat = { "0-0": 7, "0-1": 2, "1-0": 5, "1-1": 3 };
    const r = await trace([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(10, 10);
  });
});

describe("trace — direct call: 3×3 identity", () => {
  it("3×3 identity → 1+1+1 = 3", async () => {
    const identity = {
      "0-0": 1, "0-1": 0, "0-2": 0,
      "1-0": 0, "1-1": 1, "1-2": 0,
      "2-0": 0, "2-1": 0, "2-2": 1,
    };
    const r = await trace([identity], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(3, 10);
  });
});

describe("trace — direct call: scalar", () => {
  it("scalar 7 → 7 (single diagonal element)", async () => {
    const r = await trace([{ "0-0": 7 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(7, 10);
  });
});

describe("trace — direct call: non-square (more rows than cols)", () => {
  it("[[1,2],[3,4],[5,6]] (3×2) → 1+4+0 = 5 (mat[2-2] missing → 0)", async () => {
    // 3 rows, 2 cols. Diagonal entries: mat[0-0]=1, mat[1-1]=4, mat[2-2]=undefined→0
    const mat = { "0-0": 1, "0-1": 2, "1-0": 3, "1-1": 4, "2-0": 5, "2-1": 6 };
    const r = await trace([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(5, 10);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("trace — pipeline", () => {
  it("trace([1,2;3,4]) → 5", async () => {
    const r = await runPipeline(ctx("x = trace([1,2;3,4])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(5, 4);
  });

  it("trace([1,2;3,4;5,6]) → 1+4+0 = 5", async () => {
    // 3×2 matrix. mat[2-2] doesn't exist → treated as 0
    const r = await runPipeline(ctx("x = trace([1,2;3,4;5,6])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(5, 4);
  });

  it("trace(5) → 5", async () => {
    const r = await runPipeline(ctx("x = trace(5)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(5, 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────

describe("trace — unit tests: SI values used", () => {
  it("trace([3ft]) → 3*FT_M (single diagonal element)", async () => {
    const r = await runPipeline(ctx("x = trace([3ft])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(3 * FT_M, 4);
  });

  it("v = 3 ft → trace([v]) ≈ 3*FT_M", async () => {
    const r = await solveWith("3", "ft", "trace([v])");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(3 * FT_M, 4);
  });
});
