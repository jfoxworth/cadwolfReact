/**
 * Tests for identity() — solver/functions/matrix/identity.ts
 *
 * Formula: identity(n) → n×n identity matrix (1 on diagonal, 0 elsewhere).
 *   n = Math.round(args[0]["0-0"])
 *
 * Direct-call tests:
 *   - n=1 → {"0-0":1}
 *   - n=3 → 3×3 identity with 1s on diagonal, 0s off-diagonal
 *
 * Pipeline tests:
 *   - identity(3) → "0-0"=1, "0-1"=0, "1-1"=1
 *
 * Unit tests:
 *   - identity() uses SI scalar value as n (after rounding)
 *   - v = 3 m → identity(v) → n=round(3)=3 → 3×3 identity
 */

import { describe, it, expect } from "vitest";
import { identity } from "../../functions/matrix/identity";
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

describe("identity — direct call: n=1", () => {
  it("identity(1) → 1×1 matrix with 1", async () => {
    const r = await identity([{ "0-0": 1 }], ctx("x=0"));
    expect(r["0-0"]).toBe(1);
    expect(Object.keys(r)).toHaveLength(1);
  });
});

describe("identity — direct call: n=3", () => {
  it("identity(3) → 3×3 identity matrix", async () => {
    const r = await identity([{ "0-0": 3 }], ctx("x=0"));
    // Diagonal elements = 1
    expect(r["0-0"]).toBe(1);
    expect(r["1-1"]).toBe(1);
    expect(r["2-2"]).toBe(1);
    // Off-diagonal elements = 0
    expect(r["0-1"]).toBe(0);
    expect(r["0-2"]).toBe(0);
    expect(r["1-0"]).toBe(0);
    expect(r["1-2"]).toBe(0);
    expect(r["2-0"]).toBe(0);
    expect(r["2-1"]).toBe(0);
    expect(Object.keys(r)).toHaveLength(9);
  });
});

describe("identity — direct call: n=2", () => {
  it("identity(2) → 2×2 identity matrix", async () => {
    const r = await identity([{ "0-0": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBe(1);
    expect(r["1-1"]).toBe(1);
    expect(r["0-1"]).toBe(0);
    expect(r["1-0"]).toBe(0);
    expect(Object.keys(r)).toHaveLength(4);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("identity — pipeline", () => {
  it("identity(3) → 3×3 identity", async () => {
    const r = await runPipeline(ctx("x = identity(3)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
    expect(r.solution.real["1-1"]).toBeCloseTo(1, 4);
    expect(r.solution.real["2-2"]).toBeCloseTo(1, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(0, 4);
    expect(r.solution.real["1-0"]).toBeCloseTo(0, 4);
  });

  it("identity(1) → 1×1 scalar 1", async () => {
    const r = await runPipeline(ctx("x = identity(1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────

describe("identity — unit tests: SI value used as n", () => {
  it("v = 3 m → identity(v) → n=round(3)=3, produces 3×3 identity", async () => {
    // SI value of 3m is 3, so n = round(3) = 3
    const r = await solveWith("3", "m", "identity(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(1, 4);
    expect(r.solution?.real["1-1"]).toBeCloseTo(1, 4);
    expect(r.solution?.real["2-2"]).toBeCloseTo(1, 4);
    expect(r.solution?.real["0-1"]).toBeCloseTo(0, 4);
  });

  it("identity(3m) → n=round(3)=3 → 3×3 identity", async () => {
    const r = await runPipeline(ctx("x = identity(3m)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
    expect(r.solution.real["1-1"]).toBeCloseTo(1, 4);
    expect(r.solution.real["2-2"]).toBeCloseTo(1, 4);
  });
});
