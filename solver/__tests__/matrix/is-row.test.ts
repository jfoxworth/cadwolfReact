/**
 * Tests for isRow() — solver/functions/matrix/is-row.ts
 *
 * Formula: Returns 1 if rows == 1 and cols > 1, else 0.
 *   Scalars (1×1) return 0. Column vectors return 0. 2D matrices return 0.
 *   Only row vectors (1×N where N>1) return 1.
 *
 * Direct-call tests:
 *   - Scalar → 0
 *   - Row vector (1 row, 2+ cols) → 1
 *   - Column vector → 0
 *   - 2D matrix → 0
 *
 * Pipeline tests:
 *   - isRow([1,2,3]) → 1
 *   - isRow([1;2;3]) → 0
 *   - isRow(5) → 0
 *
 * Unit tests:
 *   - isRow(5m) → 0 (scalar)
 */

import { describe, it, expect } from "vitest";
import { isRow } from "../../functions/matrix/is-row";
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

describe("isRow — direct call: scalar → 0", () => {
  it("scalar 5 → 0", async () => {
    const r = await isRow([{ "0-0": 5 }], ctx("x=0"));
    expect(r["0-0"]).toBe(0);
  });
});

describe("isRow — direct call: row vector → 1", () => {
  it("[1,2,3] row vector → 1", async () => {
    const r = await isRow([{ "0-0": 1, "0-1": 2, "0-2": 3 }], ctx("x=0"));
    expect(r["0-0"]).toBe(1);
  });

  it("[5,10] 2-element row vector → 1", async () => {
    const r = await isRow([{ "0-0": 5, "0-1": 10 }], ctx("x=0"));
    expect(r["0-0"]).toBe(1);
  });
});

describe("isRow — direct call: column vector → 0", () => {
  it("[1;2;3] column vector → 0", async () => {
    const mat = { "0-0": 1, "1-0": 2, "2-0": 3 };
    const r = await isRow([mat], ctx("x=0"));
    expect(r["0-0"]).toBe(0);
  });
});

describe("isRow — direct call: 2D matrix → 0", () => {
  it("[[1,2],[3,4]] matrix → 0", async () => {
    const mat = { "0-0": 1, "0-1": 2, "1-0": 3, "1-1": 4 };
    const r = await isRow([mat], ctx("x=0"));
    expect(r["0-0"]).toBe(0);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("isRow — pipeline", () => {
  it("isRow([1,2,3]) → 1", async () => {
    const r = await runPipeline(ctx("x = isRow([1,2,3])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
  });

  it("isRow([1;2;3]) → 0", async () => {
    const r = await runPipeline(ctx("x = isRow([1;2;3])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });

  it("isRow(5) → 0", async () => {
    const r = await runPipeline(ctx("x = isRow(5)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────

describe("isRow — unit tests: shape check (not value)", () => {
  it("isRow(5m) → 0 (scalar)", async () => {
    const r = await runPipeline(ctx("x = isRow(5m)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });

  it("v = 5 m → isRow(v) → 0 (scalar)", async () => {
    const r = await solveWith("5", "m", "isRow(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(0, 4);
  });
});
