/**
 * Tests for fliplr() — solver/functions/matrix/fliplr.ts
 *
 * Formula: Flip left-to-right (reverse column order).
 *   result["row-col"] = mat["row-(cols-1-col)"]
 *
 * Direct-call tests:
 *   - [1,2,3] → [3,2,1]
 *   - [[1,2],[3,4]] → [[2,1],[4,3]]
 *   - Scalar → same (only one column)
 *
 * Pipeline tests:
 *   - fliplr([1,2,3]) → "0-0"=3, "0-2"=1
 *
 * Unit tests:
 *   - fliplr() uses SI values
 *   - fliplr([3ft,6ft]) → ["0-0"]=6*FT_M, ["0-1"]=3*FT_M
 */

import { describe, it, expect } from "vitest";
import { fliplr } from "../../functions/matrix/fliplr";
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

describe("fliplr — direct call: row vector", () => {
  it("[1,2,3] → [3,2,1]", async () => {
    const r = await fliplr([{ "0-0": 1, "0-1": 2, "0-2": 3 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(3, 10);
    expect(r["0-1"]).toBeCloseTo(2, 10);
    expect(r["0-2"]).toBeCloseTo(1, 10);
  });

  it("[5,3,1,2] → [2,1,3,5]", async () => {
    const r = await fliplr([{ "0-0": 5, "0-1": 3, "0-2": 1, "0-3": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(2, 10);
    expect(r["0-1"]).toBeCloseTo(1, 10);
    expect(r["0-2"]).toBeCloseTo(3, 10);
    expect(r["0-3"]).toBeCloseTo(5, 10);
  });
});

describe("fliplr — direct call: 2D matrix", () => {
  it("[[1,2],[3,4]] → [[2,1],[4,3]]", async () => {
    const mat = { "0-0": 1, "0-1": 2, "1-0": 3, "1-1": 4 };
    const r = await fliplr([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(2, 10);
    expect(r["0-1"]).toBeCloseTo(1, 10);
    expect(r["1-0"]).toBeCloseTo(4, 10);
    expect(r["1-1"]).toBeCloseTo(3, 10);
  });
});

describe("fliplr — direct call: scalar", () => {
  it("scalar 7 → 7 (only one column)", async () => {
    const r = await fliplr([{ "0-0": 7 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(7, 10);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("fliplr — pipeline", () => {
  it("fliplr([1,2,3]) → reversed: 0-0=3, 0-1=2, 0-2=1", async () => {
    const r = await runPipeline(ctx("x = fliplr([1,2,3])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(3, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(2, 4);
    expect(r.solution.real["0-2"]).toBeCloseTo(1, 4);
  });

  it("fliplr([1,2;3,4]) → [[2,1],[4,3]]", async () => {
    const r = await runPipeline(ctx("x = fliplr([1,2;3,4])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(2, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(1, 4);
    expect(r.solution.real["1-0"]).toBeCloseTo(4, 4);
    expect(r.solution.real["1-1"]).toBeCloseTo(3, 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────

describe("fliplr — unit tests: SI values used", () => {
  it("fliplr([3ft,6ft]) → 0-0=6*FT_M, 0-1=3*FT_M", async () => {
    const r = await runPipeline(ctx("x = fliplr([3ft,6ft])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(6 * FT_M, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(3 * FT_M, 4);
  });

  it("v = 3 ft → fliplr([v]) preserves SI value", async () => {
    const r = await solveWith("3", "ft", "fliplr([v])");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(3 * FT_M, 4);
  });
});
