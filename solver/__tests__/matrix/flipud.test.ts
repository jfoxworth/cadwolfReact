/**
 * Tests for flipud() — solver/functions/matrix/flipud.ts
 *
 * Formula: Flip up-to-down (reverse row order).
 *   result["row-col"] = mat["(rows-1-row)-col"]
 *
 * Direct-call tests:
 *   - Column vector [1;2;3] → [3;2;1] (rows reversed)
 *   - 2D matrix rows reversed
 *   - Scalar → same (only one row)
 *
 * Pipeline tests:
 *   - flipud([1;2;3]) → "0-0"=3, "2-0"=1
 *
 * Unit tests:
 *   - flipud() uses SI values
 *   - flipud([3ft;6ft]) → "0-0"=6*FT_M, "1-0"=3*FT_M
 */

import { describe, it, expect } from "vitest";
import { flipud } from "../../functions/matrix/flipud";
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

describe("flipud — direct call: column vector", () => {
  it("[1;2;3] → [3;2;1] (rows reversed)", async () => {
    // Column vector: 3 rows, 1 col
    const mat = { "0-0": 1, "1-0": 2, "2-0": 3 };
    const r = await flipud([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(3, 10);
    expect(r["1-0"]).toBeCloseTo(2, 10);
    expect(r["2-0"]).toBeCloseTo(1, 10);
  });

  it("[10;20] → [20;10]", async () => {
    const mat = { "0-0": 10, "1-0": 20 };
    const r = await flipud([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(20, 10);
    expect(r["1-0"]).toBeCloseTo(10, 10);
  });
});

describe("flipud — direct call: 2D matrix", () => {
  it("[[1,2],[3,4]] → [[3,4],[1,2]] (rows swapped)", async () => {
    const mat = { "0-0": 1, "0-1": 2, "1-0": 3, "1-1": 4 };
    const r = await flipud([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(3, 10);
    expect(r["0-1"]).toBeCloseTo(4, 10);
    expect(r["1-0"]).toBeCloseTo(1, 10);
    expect(r["1-1"]).toBeCloseTo(2, 10);
  });
});

describe("flipud — direct call: scalar", () => {
  it("scalar 7 → 7 (only one row)", async () => {
    const r = await flipud([{ "0-0": 7 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(7, 10);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("flipud — pipeline", () => {
  it("flipud([1;2;3]) → 0-0=3, 1-0=2, 2-0=1", async () => {
    const r = await runPipeline(ctx("x = flipud([1;2;3])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(3, 4);
    expect(r.solution.real["1-0"]).toBeCloseTo(2, 4);
    expect(r.solution.real["2-0"]).toBeCloseTo(1, 4);
  });

  it("flipud([1,2;3,4]) → [[3,4],[1,2]]", async () => {
    const r = await runPipeline(ctx("x = flipud([1,2;3,4])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(3, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(4, 4);
    expect(r.solution.real["1-0"]).toBeCloseTo(1, 4);
    expect(r.solution.real["1-1"]).toBeCloseTo(2, 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────

describe("flipud — unit tests: SI values used", () => {
  it("flipud([3ft;6ft]) → 0-0=6*FT_M, 1-0=3*FT_M", async () => {
    const r = await runPipeline(ctx("x = flipud([3ft;6ft])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(6 * FT_M, 4);
    expect(r.solution.real["1-0"]).toBeCloseTo(3 * FT_M, 4);
  });

  it("v = 3 ft → flipud([v]) preserves SI value", async () => {
    const r = await solveWith("3", "ft", "flipud([v])");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(3 * FT_M, 4);
  });
});
