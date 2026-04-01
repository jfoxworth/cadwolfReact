/**
 * Tests for isMatrix() — solver/functions/matrix/is-matrix.ts
 *
 * Formula: Returns 1 if rows > 1 and cols > 1, else 0.
 *   Scalars, row vectors, and column vectors all return 0.
 *   Only true 2D matrices (≥2 rows AND ≥2 cols) return 1.
 *
 * Direct-call tests:
 *   - Scalar → 0
 *   - Row vector → 0
 *   - Column vector → 0
 *   - 2D matrix (≥2×2) → 1
 *
 * Pipeline tests:
 *   - isMatrix([1,2;3,4]) → 1
 *   - isMatrix([1,2,3]) → 0
 *   - isMatrix([1;2;3]) → 0
 *
 * Unit tests:
 *   - isMatrix(5m) → 0 (scalar)
 */

import { describe, it, expect } from "vitest";
import { isMatrix } from "../../functions/matrix/is-matrix";
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

describe("isMatrix — direct call: scalar → 0", () => {
  it("scalar 5 → 0", async () => {
    const r = await isMatrix([{ "0-0": 5 }], ctx("x=0"));
    expect(r["0-0"]).toBe(0);
  });
});

describe("isMatrix — direct call: row vector → 0", () => {
  it("[1,2,3] row vector → 0", async () => {
    const r = await isMatrix([{ "0-0": 1, "0-1": 2, "0-2": 3 }], ctx("x=0"));
    expect(r["0-0"]).toBe(0);
  });
});

describe("isMatrix — direct call: column vector → 0", () => {
  it("[1;2;3] column vector → 0", async () => {
    const mat = { "0-0": 1, "1-0": 2, "2-0": 3 };
    const r = await isMatrix([mat], ctx("x=0"));
    expect(r["0-0"]).toBe(0);
  });
});

describe("isMatrix — direct call: 2D matrix → 1", () => {
  it("[[1,2],[3,4]] 2×2 matrix → 1", async () => {
    const mat = { "0-0": 1, "0-1": 2, "1-0": 3, "1-1": 4 };
    const r = await isMatrix([mat], ctx("x=0"));
    expect(r["0-0"]).toBe(1);
  });

  it("3×3 matrix → 1", async () => {
    const mat = {
      "0-0": 1, "0-1": 2, "0-2": 3,
      "1-0": 4, "1-1": 5, "1-2": 6,
      "2-0": 7, "2-1": 8, "2-2": 9,
    };
    const r = await isMatrix([mat], ctx("x=0"));
    expect(r["0-0"]).toBe(1);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("isMatrix — pipeline", () => {
  it("isMatrix([1,2;3,4]) → 1", async () => {
    const r = await runPipeline(ctx("x = isMatrix([1,2;3,4])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
  });

  it("isMatrix([1,2,3]) → 0", async () => {
    const r = await runPipeline(ctx("x = isMatrix([1,2,3])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });

  it("isMatrix([1;2;3]) → 0", async () => {
    const r = await runPipeline(ctx("x = isMatrix([1;2;3])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });

  it("isMatrix(5) → 0", async () => {
    const r = await runPipeline(ctx("x = isMatrix(5)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────

describe("isMatrix — unit tests: shape check (not value)", () => {
  it("isMatrix(5m) → 0 (scalar)", async () => {
    const r = await runPipeline(ctx("x = isMatrix(5m)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });

  it("v = 5 m → isMatrix(v) → 0 (scalar)", async () => {
    const r = await solveWith("5", "m", "isMatrix(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(0, 4);
  });
});
