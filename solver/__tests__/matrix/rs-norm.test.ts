/**
 * Tests for rsNorm() — solver/functions/matrix/rs-norm.ts
 *
 * Formula: Row-sum norm (max over rows of sum of |absolute values| in that row).
 *   result = max_a ( Σ_b |mat[a-b]| )
 *
 * Direct-call tests:
 *   - Scalar → |value|
 *   - [3,-4] row vector → 3+4=7 (sum of all absolute values in that one row)
 *   - [[1,2],[3,4]] → max(1+2, 3+4) = max(3,7) = 7
 *
 * Pipeline tests:
 *   - rsNorm([3,4]) → 7
 *   - rsNorm([1,2;3,4]) → 7
 *
 * Unit tests:
 *   - rsNorm() uses SI values
 *   - rsNorm(3ft) → 3*FT_M
 */

import { describe, it, expect } from "vitest";
import { rsNorm } from "../../functions/matrix/rs-norm";
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

describe("rsNorm — direct call: scalar", () => {
  it("scalar 5 → 5", async () => {
    const r = await rsNorm([{ "0-0": 5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(5, 10);
  });

  it("scalar -7 → 7 (absolute value)", async () => {
    const r = await rsNorm([{ "0-0": -7 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(7, 10);
  });
});

describe("rsNorm — direct call: row vector", () => {
  it("[3,-4] → 3+4=7 (sum of absolute values in the one row)", async () => {
    const r = await rsNorm([{ "0-0": 3, "0-1": -4 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(7, 10);
  });

  it("[1,2,3] → 6", async () => {
    const r = await rsNorm([{ "0-0": 1, "0-1": 2, "0-2": 3 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(6, 10);
  });
});

describe("rsNorm — direct call: 2D matrix", () => {
  it("[[1,2],[3,4]] → max(1+2, 3+4) = 7", async () => {
    const mat = { "0-0": 1, "0-1": 2, "1-0": 3, "1-1": 4 };
    const r = await rsNorm([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(7, 10);
  });

  it("[[5,1],[2,1]] → max(5+1, 2+1) = 6", async () => {
    const mat = { "0-0": 5, "0-1": 1, "1-0": 2, "1-1": 1 };
    const r = await rsNorm([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(6, 10);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("rsNorm — pipeline", () => {
  it("rsNorm([3,4]) → 7", async () => {
    const r = await runPipeline(ctx("x = rsNorm([3,4])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(7, 4);
  });

  it("rsNorm([1,2;3,4]) → 7", async () => {
    const r = await runPipeline(ctx("x = rsNorm([1,2;3,4])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(7, 4);
  });

  it("rsNorm(5) → 5", async () => {
    const r = await runPipeline(ctx("x = rsNorm(5)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(5, 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────

describe("rsNorm — unit tests: SI values used", () => {
  it("rsNorm(3ft) → 3*FT_M", async () => {
    const r = await runPipeline(ctx("x = rsNorm(3ft)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(3 * FT_M, 4);
  });

  it("v = 3 ft → rsNorm(v) ≈ 3*FT_M", async () => {
    const r = await solveWith("3", "ft", "rsNorm(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(3 * FT_M, 4);
  });
});
