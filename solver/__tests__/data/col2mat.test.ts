/**
 * Tests for col2mat() — solver/functions/data/col2mat.ts
 *
 * Formula: col2mat(colVec, numCols)
 *   Broadcasts a column vector (N×1) into an N×numCols matrix by repeating it
 *   as identical columns.
 *
 * Direct-call tests:
 *   - 3×1 vector, numCols=1 → 3×1 (unchanged)
 *   - 3×1 vector, numCols=3 → 3×3 (each column identical)
 *   - Single-element vector, numCols=4 → 1×4
 *   - Empty colVec → { "0-0": 0 }
 *
 * Pipeline tests:
 *   - col2mat([1;2;3], 2) → 3×2 matrix, all columns equal [1,2,3]
 *   - col2mat([5;5], 3) → 2×3 matrix of 5s
 *
 * Unit tests:
 *   - col2mat() operates on SI-converted values; structure is the primary output
 *   - col2mat(v, 2) where v is a unit-bearing variable → correct broadcast
 */

import { describe, it, expect } from "vitest";
import { col2mat } from "../../functions/data/col2mat";
import { runPipeline } from "../../pipeline";
import { ctx } from "../helpers";
import { solveDocument } from "../../worker/document-solver";
import type { OrderedBlock } from "../../types";

// ── Direct call tests ──────────────────────────────────────────────────────────

describe("col2mat — direct call: basic broadcast", () => {
  it("3×1 vector, numCols=1 → 3×1 (no change)", async () => {
    const colVec = { "0-0": 1, "1-0": 2, "2-0": 3 };
    const r = await col2mat([colVec, { "0-0": 1 }], ctx("x=0"));
    expect(r["0-0"]).toBe(1);
    expect(r["1-0"]).toBe(2);
    expect(r["2-0"]).toBe(3);
    expect(Object.keys(r)).toHaveLength(3);
  });

  it("3×1 vector [1,2,3], numCols=3 → 3×3 all columns equal", async () => {
    const colVec = { "0-0": 1, "1-0": 2, "2-0": 3 };
    const r = await col2mat([colVec, { "0-0": 3 }], ctx("x=0"));
    expect(r["0-0"]).toBe(1); expect(r["0-1"]).toBe(1); expect(r["0-2"]).toBe(1);
    expect(r["1-0"]).toBe(2); expect(r["1-1"]).toBe(2); expect(r["1-2"]).toBe(2);
    expect(r["2-0"]).toBe(3); expect(r["2-1"]).toBe(3); expect(r["2-2"]).toBe(3);
    expect(Object.keys(r)).toHaveLength(9);
  });

  it("1×1 scalar vector, numCols=4 → 1×4 row of same value", async () => {
    const r = await col2mat([{ "0-0": 7 }, { "0-0": 4 }], ctx("x=0"));
    expect(r["0-0"]).toBe(7);
    expect(r["0-1"]).toBe(7);
    expect(r["0-2"]).toBe(7);
    expect(r["0-3"]).toBe(7);
    expect(Object.keys(r)).toHaveLength(4);
  });

  it("empty colVec → { '0-0': 0 }", async () => {
    const r = await col2mat([{}, { "0-0": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBe(0);
    expect(Object.keys(r)).toHaveLength(1);
  });

  it("2×1 vector [5,10], numCols=2 → 2×2 matrix", async () => {
    const r = await col2mat([{ "0-0": 5, "1-0": 10 }, { "0-0": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBe(5); expect(r["0-1"]).toBe(5);
    expect(r["1-0"]).toBe(10); expect(r["1-1"]).toBe(10);
    expect(Object.keys(r)).toHaveLength(4);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("col2mat — pipeline: basic", () => {
  it("col2mat([1;2;3], 2) → 3×2, each column is [1,2,3]", async () => {
    const r = await runPipeline(ctx("x = col2mat([1;2;3], 2)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(1, 4);
    expect(r.solution.real["1-0"]).toBeCloseTo(2, 4);
    expect(r.solution.real["1-1"]).toBeCloseTo(2, 4);
    expect(r.solution.real["2-0"]).toBeCloseTo(3, 4);
    expect(r.solution.real["2-1"]).toBeCloseTo(3, 4);
  });

  it("col2mat([5;5], 3) → 2×3 matrix of 5s", async () => {
    const r = await runPipeline(ctx("x = col2mat([5;5], 3)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(5, 4);
    expect(r.solution.real["0-2"]).toBeCloseTo(5, 4);
    expect(r.solution.real["1-2"]).toBeCloseTo(5, 4);
  });

  it("col2mat([4;8], 1) → 2×1 unchanged", async () => {
    const r = await runPipeline(ctx("x = col2mat([4;8], 1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(4, 4);
    expect(r.solution.real["1-0"]).toBeCloseTo(8, 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────

async function solveWith(varVal: string, varUnit: string, fnExpr: string) {
  const blocks: OrderedBlock[] = [
    { id: "vb", order: 1, type: "EQUATION", definition: { raw: `v = ${varVal}`, variableName: "v", unit: varUnit } },
    { id: "xb", order: 2, type: "EQUATION", definition: { raw: `x = ${fnExpr}`, variableName: "x", unit: "" } },
  ];
  const r1 = await solveDocument(blocks, "vb", []);
  const r2 = await solveDocument(blocks, "xb", r1.resolvedMap);
  return r2.results.find((r) => r.blockId === "xb")!;
}

describe("col2mat — unit tests: SI values are broadcast", () => {
  it("col2mat(3m, 2) → single scalar repeated as 1×2 (SI value = 3)", async () => {
    const r = await solveWith("3", "m", "col2mat(v, 2)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(3, 4);
    expect(r.solution?.real["0-1"]).toBeCloseTo(3, 4);
  });

  it("col2mat(2ft, 2) → SI value (0.6096 m) repeated as 1×2", async () => {
    const FT_M = 0.3048;
    const r = await solveWith("2", "ft", "col2mat(v, 2)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(2 * FT_M, 4);
    expect(r.solution?.real["0-1"]).toBeCloseTo(2 * FT_M, 4);
  });
});
