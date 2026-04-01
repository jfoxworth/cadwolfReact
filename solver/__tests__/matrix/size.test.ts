/**
 * Tests for size() — solver/functions/matrix/size.ts
 *
 * Formula: size(mat, dim) — returns dimension size (1-indexed).
 *   dim=1 → number of rows, dim=2 → number of columns
 *   Returns 0 if dim is out of range.
 *
 * Direct-call tests:
 *   - Scalar dim=1 → 1, dim=2 → 1
 *   - 2×3 matrix dim=1 → 2, dim=2 → 3
 *   - Row vector dim=1 → 1, dim=2 → N
 *
 * Pipeline tests:
 *   - size([1,2,3], 1) → 1
 *   - size([1,2,3], 2) → 3
 *   - size([1,2;3,4;5,6], 1) → 3
 *
 * Unit tests:
 *   - size() counts shape, not value
 *   - size(5m, 1) → 1 (scalar)
 */

import { describe, it, expect } from "vitest";
import { size } from "../../functions/matrix/size";
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

describe("size — direct call: scalar", () => {
  it("scalar dim=1 → 1 (one row)", async () => {
    const r = await size([{ "0-0": 42 }, { "0-0": 1 }], ctx("x=0"));
    expect(r["0-0"]).toBe(1);
  });

  it("scalar dim=2 → 1 (one col)", async () => {
    const r = await size([{ "0-0": 42 }, { "0-0": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBe(1);
  });
});

describe("size — direct call: row vector", () => {
  it("1×4 row vector dim=1 → 1 (one row)", async () => {
    const mat = { "0-0": 1, "0-1": 2, "0-2": 3, "0-3": 4 };
    const r = await size([mat, { "0-0": 1 }], ctx("x=0"));
    expect(r["0-0"]).toBe(1);
  });

  it("1×4 row vector dim=2 → 4 (four cols)", async () => {
    const mat = { "0-0": 1, "0-1": 2, "0-2": 3, "0-3": 4 };
    const r = await size([mat, { "0-0": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBe(4);
  });
});

describe("size — direct call: 2D matrix", () => {
  it("2×3 matrix dim=1 → 2 rows", async () => {
    const mat = {
      "0-0": 1, "0-1": 2, "0-2": 3,
      "1-0": 4, "1-1": 5, "1-2": 6,
    };
    const r = await size([mat, { "0-0": 1 }], ctx("x=0"));
    expect(r["0-0"]).toBe(2);
  });

  it("2×3 matrix dim=2 → 3 cols", async () => {
    const mat = {
      "0-0": 1, "0-1": 2, "0-2": 3,
      "1-0": 4, "1-1": 5, "1-2": 6,
    };
    const r = await size([mat, { "0-0": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBe(3);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("size — pipeline", () => {
  it("size([1,2,3], 1) → 1 (1 row)", async () => {
    const r = await runPipeline(ctx("x = size([1,2,3], 1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
  });

  it("size([1,2,3], 2) → 3 (3 cols)", async () => {
    const r = await runPipeline(ctx("x = size([1,2,3], 2)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(3, 4);
  });

  it("size([1,2;3,4;5,6], 1) → 3 rows", async () => {
    const r = await runPipeline(ctx("x = size([1,2;3,4;5,6], 1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(3, 4);
  });

  it("size([1,2;3,4;5,6], 2) → 2 cols", async () => {
    const r = await runPipeline(ctx("x = size([1,2;3,4;5,6], 2)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(2, 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────

describe("size — unit tests: shape check (not value)", () => {
  it("size(5m, 1) → 1 (scalar)", async () => {
    const r = await runPipeline(ctx("x = size(5m, 1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
  });

  it("size(5m, 2) → 1 (scalar, 1 col)", async () => {
    const r = await runPipeline(ctx("x = size(5m, 2)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
  });

  it("v = 5 m → size(v, 1) → 1", async () => {
    const r = await solveWith("5", "m", "size(v, 1)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(1, 4);
  });
});
