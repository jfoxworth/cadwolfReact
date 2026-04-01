/**
 * Tests for length() — solver/functions/matrix/length.ts
 *
 * Formula: Returns max(rows, cols) — the size of the largest dimension.
 *
 * Direct-call tests:
 *   - Scalar → 1
 *   - 1×4 row vector → 4
 *   - 3×2 matrix → 3
 *   - 2×5 matrix → 5
 *
 * Pipeline tests:
 *   - length([1,2,3,4]) → 4
 *   - length([1,2;3,4;5,6]) → 3
 *
 * Unit tests:
 *   - length(5m) → 1 (scalar, shape is what matters not value)
 *   - length([1m,2m,3m]) → 3 via pipeline
 */

import { describe, it, expect } from "vitest";
import { length } from "../../functions/matrix/length";
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

// ── Direct call tests ──────────────────────────────────────────────────────────

describe("length — direct call: scalar → 1", () => {
  it("scalar → 1", async () => {
    const r = await length([{ "0-0": 42 }], ctx("x=0"));
    expect(r["0-0"]).toBe(1);
  });
});

describe("length — direct call: row vector", () => {
  it("1×4 row vector → 4", async () => {
    const r = await length([{ "0-0": 1, "0-1": 2, "0-2": 3, "0-3": 4 }], ctx("x=0"));
    expect(r["0-0"]).toBe(4);
  });

  it("1×3 row vector → 3", async () => {
    const r = await length([{ "0-0": 1, "0-1": 2, "0-2": 3 }], ctx("x=0"));
    expect(r["0-0"]).toBe(3);
  });
});

describe("length — direct call: column vector", () => {
  it("3×1 column vector → 3", async () => {
    const mat = { "0-0": 1, "1-0": 2, "2-0": 3 };
    const r = await length([mat], ctx("x=0"));
    expect(r["0-0"]).toBe(3);
  });
});

describe("length — direct call: 2D matrix", () => {
  it("3×2 matrix → 3 (max is rows)", async () => {
    const mat = {
      "0-0": 1, "0-1": 2,
      "1-0": 3, "1-1": 4,
      "2-0": 5, "2-1": 6,
    };
    const r = await length([mat], ctx("x=0"));
    expect(r["0-0"]).toBe(3);
  });

  it("2×5 matrix → 5 (max is cols)", async () => {
    const mat = {
      "0-0": 1, "0-1": 2, "0-2": 3, "0-3": 4, "0-4": 5,
      "1-0": 6, "1-1": 7, "1-2": 8, "1-3": 9, "1-4": 10,
    };
    const r = await length([mat], ctx("x=0"));
    expect(r["0-0"]).toBe(5);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("length — pipeline", () => {
  it("length([1,2,3,4]) → 4", async () => {
    const r = await runPipeline(ctx("x = length([1,2,3,4])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(4, 4);
  });

  it("length([1,2;3,4;5,6]) → 3 (3 rows, 2 cols)", async () => {
    const r = await runPipeline(ctx("x = length([1,2;3,4;5,6])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(3, 4);
  });

  it("length(5) → 1", async () => {
    const r = await runPipeline(ctx("x = length(5)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────

describe("length — unit tests: counts shape, not value", () => {
  it("length(5m) → 1 (scalar)", async () => {
    const r = await runPipeline(ctx("x = length(5m)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
  });

  it("length([1m,2m,3m]) → 3 (row vector, 3 elements)", async () => {
    const r = await runPipeline(ctx("x = length([1m,2m,3m])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(3, 4);
  });

  it("v = 5 m → length(v) → 1", async () => {
    const r = await solveWith("5", "m", "length(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(1, 4);
  });
});
