/**
 * Tests for row2mat() — solver/functions/data/row2mat.ts
 *
 * Formula: row2mat(rowVec, numRows)
 *   Broadcasts a row vector (1×M) into a numRows×M matrix by repeating it
 *   as identical rows.
 *
 * Direct-call tests:
 *   - 1×3 vector, numRows=1 → 1×3 (unchanged)
 *   - 1×3 vector, numRows=3 → 3×3 (each row identical)
 *   - Single-element vector, numRows=4 → 4×1
 *   - Empty rowVec → { "0-0": 0 }
 *
 * Pipeline tests:
 *   - row2mat([1,2,3], 2) → 2×3 matrix, all rows equal [1,2,3]
 *   - row2mat([5,5], 3) → 3×2 matrix of 5s
 *
 * Unit tests:
 *   - row2mat() operates on SI-converted values; structure is the primary output
 *   - row2mat(v, 2) where v is a unit-bearing variable → correct broadcast
 */

import { describe, it, expect } from "vitest";
import { row2mat } from "../../functions/data/row2mat";
import { runPipeline } from "../../pipeline";
import { ctx } from "../helpers";
import { solveDocument } from "../../worker/document-solver";
import type { OrderedBlock } from "../../types";

// ── Direct call tests ──────────────────────────────────────────────────────────

describe("row2mat — direct call: basic broadcast", () => {
  it("1×3 vector, numRows=1 → 1×3 (no change)", async () => {
    const rowVec = { "0-0": 1, "0-1": 2, "0-2": 3 };
    const r = await row2mat([rowVec, { "0-0": 1 }], ctx("x=0"));
    expect(r["0-0"]).toBe(1);
    expect(r["0-1"]).toBe(2);
    expect(r["0-2"]).toBe(3);
    expect(Object.keys(r)).toHaveLength(3);
  });

  it("1×3 vector [1,2,3], numRows=3 → 3×3, all rows identical", async () => {
    const rowVec = { "0-0": 1, "0-1": 2, "0-2": 3 };
    const r = await row2mat([rowVec, { "0-0": 3 }], ctx("x=0"));
    expect(r["0-0"]).toBe(1); expect(r["0-1"]).toBe(2); expect(r["0-2"]).toBe(3);
    expect(r["1-0"]).toBe(1); expect(r["1-1"]).toBe(2); expect(r["1-2"]).toBe(3);
    expect(r["2-0"]).toBe(1); expect(r["2-1"]).toBe(2); expect(r["2-2"]).toBe(3);
    expect(Object.keys(r)).toHaveLength(9);
  });

  it("1×1 scalar vector, numRows=4 → 4×1 column of same value", async () => {
    const r = await row2mat([{ "0-0": 7 }, { "0-0": 4 }], ctx("x=0"));
    expect(r["0-0"]).toBe(7);
    expect(r["1-0"]).toBe(7);
    expect(r["2-0"]).toBe(7);
    expect(r["3-0"]).toBe(7);
    expect(Object.keys(r)).toHaveLength(4);
  });

  it("empty rowVec → { '0-0': 0 }", async () => {
    const r = await row2mat([{}, { "0-0": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBe(0);
    expect(Object.keys(r)).toHaveLength(1);
  });

  it("1×2 vector [5,10], numRows=2 → 2×2 matrix", async () => {
    const r = await row2mat([{ "0-0": 5, "0-1": 10 }, { "0-0": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBe(5);  expect(r["0-1"]).toBe(10);
    expect(r["1-0"]).toBe(5);  expect(r["1-1"]).toBe(10);
    expect(Object.keys(r)).toHaveLength(4);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("row2mat — pipeline: basic", () => {
  it("row2mat([1,2,3], 2) → 2×3, each row is [1,2,3]", async () => {
    const r = await runPipeline(ctx("x = row2mat([1,2,3], 2)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(2, 4);
    expect(r.solution.real["0-2"]).toBeCloseTo(3, 4);
    expect(r.solution.real["1-0"]).toBeCloseTo(1, 4);
    expect(r.solution.real["1-1"]).toBeCloseTo(2, 4);
    expect(r.solution.real["1-2"]).toBeCloseTo(3, 4);
  });

  it("row2mat([5,5], 3) → 3×2 matrix of 5s", async () => {
    const r = await runPipeline(ctx("x = row2mat([5,5], 3)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(5, 4);
    expect(r.solution.real["2-1"]).toBeCloseTo(5, 4);
  });

  it("row2mat([4,8], 1) → 1×2 unchanged", async () => {
    const r = await runPipeline(ctx("x = row2mat([4,8], 1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(4, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(8, 4);
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

describe("row2mat — unit tests: SI values are broadcast", () => {
  it("row2mat(3m, 2) → scalar repeated as 2×1 (SI value = 3)", async () => {
    const r = await solveWith("3", "m", "row2mat(v, 2)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(3, 4);
    expect(r.solution?.real["1-0"]).toBeCloseTo(3, 4);
  });

  it("row2mat(2ft, 3) → SI value (0.6096 m) repeated as 3×1", async () => {
    const FT_M = 0.3048;
    const r = await solveWith("2", "ft", "row2mat(v, 3)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(2 * FT_M, 4);
    expect(r.solution?.real["2-0"]).toBeCloseTo(2 * FT_M, 4);
  });

  it("row2mat(5 m/s, 2) → SI value repeated as 2×1", async () => {
    const r = await solveWith("5", "m/s", "row2mat(v, 2)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(5, 4);
    expect(r.solution?.real["1-0"]).toBeCloseTo(5, 4);
  });
});
