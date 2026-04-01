/**
 * Tests for numEl() — solver/functions/matrix/num-el.ts
 *
 * Formula: Returns total element count = Object.keys(mat).length
 *
 * Direct-call tests:
 *   - Scalar → 1
 *   - 1×4 row vector → 4
 *   - 3×3 matrix → 9
 *
 * Pipeline tests:
 *   - numEl([1,2,3]) → 3
 *   - numEl([1,2;3,4]) → 4
 *
 * Unit tests:
 *   - numEl() counts elements regardless of unit/value
 *   - numEl(5m) → 1
 *   - numEl([1m,2m,3m]) → 3
 */

import { describe, it, expect } from "vitest";
import { numEl } from "../../functions/matrix/num-el";
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

describe("numEl — direct call: scalar", () => {
  it("scalar → 1 element", async () => {
    const r = await numEl([{ "0-0": 42 }], ctx("x=0"));
    expect(r["0-0"]).toBe(1);
  });
});

describe("numEl — direct call: row vector", () => {
  it("1×4 row vector → 4", async () => {
    const r = await numEl([{ "0-0": 1, "0-1": 2, "0-2": 3, "0-3": 4 }], ctx("x=0"));
    expect(r["0-0"]).toBe(4);
  });

  it("1×3 row vector → 3", async () => {
    const r = await numEl([{ "0-0": 1, "0-1": 2, "0-2": 3 }], ctx("x=0"));
    expect(r["0-0"]).toBe(3);
  });
});

describe("numEl — direct call: 2D matrix", () => {
  it("3×3 matrix → 9", async () => {
    const mat = {
      "0-0": 1, "0-1": 2, "0-2": 3,
      "1-0": 4, "1-1": 5, "1-2": 6,
      "2-0": 7, "2-1": 8, "2-2": 9,
    };
    const r = await numEl([mat], ctx("x=0"));
    expect(r["0-0"]).toBe(9);
  });

  it("2×2 matrix → 4", async () => {
    const mat = { "0-0": 1, "0-1": 2, "1-0": 3, "1-1": 4 };
    const r = await numEl([mat], ctx("x=0"));
    expect(r["0-0"]).toBe(4);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("numEl — pipeline", () => {
  it("numEl([1,2,3]) → 3", async () => {
    const r = await runPipeline(ctx("x = numEl([1,2,3])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(3, 4);
  });

  it("numEl([1,2;3,4]) → 4", async () => {
    const r = await runPipeline(ctx("x = numEl([1,2;3,4])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(4, 4);
  });

  it("numEl(5) → 1", async () => {
    const r = await runPipeline(ctx("x = numEl(5)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────

describe("numEl — unit tests: counts elements, not value", () => {
  it("numEl(5m) → 1 (scalar)", async () => {
    const r = await runPipeline(ctx("x = numEl(5m)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
  });

  it("numEl([1m,2m,3m]) → 3 (row vector)", async () => {
    const r = await runPipeline(ctx("x = numEl([1m,2m,3m])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(3, 4);
  });

  it("v = 5 m → numEl(v) → 1", async () => {
    const r = await solveWith("5", "m", "numEl(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(1, 4);
  });
});
