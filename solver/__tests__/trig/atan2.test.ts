/**
 * Tests for atan2() — solver/functions/trig/atan2.ts
 *
 * Formula: Math.atan2(args[0]['0-0'], args[1]['0-0'])
 * Scalar-only function (operates on the first element of each argument).
 * Returns the angle in radians between the positive x-axis and the point (x, y).
 * Output is in (-π, π].
 *
 * Direct-call tests:
 *   - atan2(0, 1) → 0  (positive x-axis)
 *   - atan2(1, 0) → π/2  (positive y-axis)
 *   - atan2(0, -1) → π  (negative x-axis)
 *   - atan2(-1, 0) → -π/2  (negative y-axis)
 *   - atan2(1, 1) → π/4
 *   - atan2(1, -1) → 3π/4
 *   - atan2(-1, -1) → -3π/4
 *   - atan2(-1, 1) → -π/4
 *
 * Pipeline tests:
 *   - x = atan2(1, 1) → π/4
 *   - x = atan2(0, 1) → 0
 *   - x = atan2(1, 0) → π/2
 *   - x = atan2(0, -1) → π
 *
 * Unit tests:
 *   - atan2() receives the SI-converted numeric values of both arguments
 *   - atan2(1ft, 1ft) → atan2(0.3048, 0.3048) = π/4 (units cancel)
 */

import { describe, it, expect } from "vitest";
import { atan2 } from "../../functions/trig/atan2";
import { runPipeline } from "../../pipeline";
import { ctx } from "../helpers";

// ── Direct call tests ──────────────────────────────────────────────────────────

describe("atan2 — direct call: quadrants", () => {
  it("atan2(0, 1) → 0 (positive x-axis)", async () => {
    const r = await atan2([{ "0-0": 0 }, { "0-0": 1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });

  it("atan2(1, 0) → π/2 (positive y-axis)", async () => {
    const r = await atan2([{ "0-0": 1 }, { "0-0": 0 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.PI / 2, 10);
  });

  it("atan2(0, -1) → π (negative x-axis)", async () => {
    const r = await atan2([{ "0-0": 0 }, { "0-0": -1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.PI, 10);
  });

  it("atan2(-1, 0) → -π/2 (negative y-axis)", async () => {
    const r = await atan2([{ "0-0": -1 }, { "0-0": 0 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-Math.PI / 2, 10);
  });

  it("atan2(1, 1) → π/4 (45°)", async () => {
    const r = await atan2([{ "0-0": 1 }, { "0-0": 1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.PI / 4, 10);
  });

  it("atan2(1, -1) → 3π/4 (135°)", async () => {
    const r = await atan2([{ "0-0": 1 }, { "0-0": -1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(3 * Math.PI / 4, 10);
  });

  it("atan2(-1, -1) → -3π/4 (-135°)", async () => {
    const r = await atan2([{ "0-0": -1 }, { "0-0": -1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-3 * Math.PI / 4, 10);
  });

  it("atan2(-1, 1) → -π/4 (-45°)", async () => {
    const r = await atan2([{ "0-0": -1 }, { "0-0": 1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-Math.PI / 4, 10);
  });

  it("atan2(√3, 1) → π/3", async () => {
    const r = await atan2([{ "0-0": Math.sqrt(3) }, { "0-0": 1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.PI / 3, 10);
  });

  it("atan2(1, √3) → π/6", async () => {
    const r = await atan2([{ "0-0": 1 }, { "0-0": Math.sqrt(3) }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.PI / 6, 10);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("atan2 — pipeline: scalars", () => {
  it("x = atan2(0, 1) → 0", async () => {
    const r = await runPipeline(ctx("x = atan2(0, 1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });

  it("x = atan2(1, 1) → π/4", async () => {
    const r = await runPipeline(ctx("x = atan2(1, 1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.PI / 4, 4);
  });

  it("x = atan2(1, 0) → π/2", async () => {
    const r = await runPipeline(ctx("x = atan2(1, 0)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.PI / 2, 4);
  });

  it("x = atan2(0, -1) → π", async () => {
    const r = await runPipeline(ctx("x = atan2(0, -1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.PI, 4);
  });

  it("x = atan2(-1, 0) → -π/2", async () => {
    const r = await runPipeline(ctx("x = atan2(-1, 0)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(-Math.PI / 2, 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────
// atan2() receives the SI-converted numeric values of both arguments.
// When both args have the same unit, the ratio is dimensionless so the
// result is the same as the dimensionless case.

describe("atan2 — unit-bearing inline arguments", () => {
  it("atan2(1ft, 1ft) → π/4 (equal ft values → same ratio)", async () => {
    const r = await runPipeline(ctx("x = atan2(1ft, 1ft)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.PI / 4, 4);
  });

  it("atan2(1m, 0m) → π/2", async () => {
    const r = await runPipeline(ctx("x = atan2(1m, 0m)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.PI / 2, 4);
  });
});
