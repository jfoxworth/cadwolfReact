/**
 * Tests for threshold() — solver/functions/matrix/threshold.ts
 *
 * Formula: Clamp each element to [low, high].
 *   Values above high → set to high
 *   Values below low  → set to low
 *   Bounds are disabled if their arg is absent or empty.
 *
 * Direct-call tests:
 *   - [1,5,10] clamped to [3,8] → [3,5,8]
 *   - Only lower bound: values below 3 clamped
 *   - Only upper bound: values above 8 clamped
 *   - All within range → unchanged
 *
 * Pipeline tests:
 *   - threshold([1,5,10], 3, 8) → "0-0"=3, "0-1"=5, "0-2"=8
 *
 * Unit tests:
 *   - threshold() uses SI values of input
 *   - threshold(10ft, 1, 5) → SI(10ft)=3.048, clamped to [1,5] → 3.048 (in range)
 */

import { describe, it, expect } from "vitest";
import { threshold } from "../../functions/matrix/threshold";
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

describe("threshold — direct call: both bounds", () => {
  it("[1,5,10] clamped to [3,8] → [3,5,8]", async () => {
    const mat = { "0-0": 1, "0-1": 5, "0-2": 10 };
    const low  = { "0-0": 3 };
    const high = { "0-0": 8 };
    const r = await threshold([mat, low, high], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(3, 10);
    expect(r["0-1"]).toBeCloseTo(5, 10);
    expect(r["0-2"]).toBeCloseTo(8, 10);
  });

  it("all values in range → unchanged", async () => {
    const mat = { "0-0": 4, "0-1": 5, "0-2": 6 };
    const low  = { "0-0": 3 };
    const high = { "0-0": 8 };
    const r = await threshold([mat, low, high], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(4, 10);
    expect(r["0-1"]).toBeCloseTo(5, 10);
    expect(r["0-2"]).toBeCloseTo(6, 10);
  });
});

describe("threshold — direct call: lower bound only", () => {
  it("[1,5,10] clamped with low=3 (no high) → [3,5,10]", async () => {
    const mat = { "0-0": 1, "0-1": 5, "0-2": 10 };
    const low  = { "0-0": 3 };
    const r = await threshold([mat, low], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(3, 10);
    expect(r["0-1"]).toBeCloseTo(5, 10);
    expect(r["0-2"]).toBeCloseTo(10, 10);
  });
});

describe("threshold — direct call: upper bound only", () => {
  it("[1,5,10] clamped with high=8 (no low) → [1,5,8]", async () => {
    const mat = { "0-0": 1, "0-1": 5, "0-2": 10 };
    const high = { "0-0": 8 };
    const r = await threshold([mat, {}, high], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
    expect(r["0-1"]).toBeCloseTo(5, 10);
    expect(r["0-2"]).toBeCloseTo(8, 10);
  });
});

describe("threshold — direct call: scalar", () => {
  it("scalar 15 clamped to [3,8] → 8", async () => {
    const r = await threshold([{ "0-0": 15 }, { "0-0": 3 }, { "0-0": 8 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(8, 10);
  });

  it("scalar 1 clamped to [3,8] → 3", async () => {
    const r = await threshold([{ "0-0": 1 }, { "0-0": 3 }, { "0-0": 8 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(3, 10);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("threshold — pipeline", () => {
  it("threshold([1,5,10], 3, 8) → [3,5,8]", async () => {
    const r = await runPipeline(ctx("x = threshold([1,5,10], 3, 8)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(3, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(5, 4);
    expect(r.solution.real["0-2"]).toBeCloseTo(8, 4);
  });

  it("threshold(15, 3, 8) → 8", async () => {
    const r = await runPipeline(ctx("x = threshold(15, 3, 8)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(8, 4);
  });

  it("threshold(1, 3, 8) → 3", async () => {
    const r = await runPipeline(ctx("x = threshold(1, 3, 8)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(3, 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────

describe("threshold — unit tests: SI values used", () => {
  it("threshold(10ft, 1, 5) → SI(10ft)=3.048, within [1,5] → 3.048", async () => {
    // 10 ft in SI = 10 * 0.3048 = 3.048, which is within [1,5], so not clamped
    const r = await runPipeline(ctx("x = threshold(10ft, 1, 5)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(10 * FT_M, 4);
  });

  it("threshold(1ft, 1, 5) → SI(1ft)=0.3048, below low=1, clamped to 1", async () => {
    // 1 ft in SI = 0.3048, which is below low=1, so clamped to 1
    const r = await runPipeline(ctx("x = threshold(1ft, 1, 5)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
  });

  it("v = 10 ft → threshold(v, 1, 5) → 3.048 (in range)", async () => {
    const r = await solveWith("10", "ft", "threshold(v, 1, 5)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(10 * FT_M, 4);
  });
});
