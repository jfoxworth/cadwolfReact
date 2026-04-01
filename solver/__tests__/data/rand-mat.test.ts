/**
 * Tests for randMat() — solver/functions/data/rand-mat.ts
 *
 * Formula: randMat(lower, upper, precision, rows, cols)
 *   Returns a rows×cols matrix of random numbers in [lower, upper).
 *   precision = decimal places (0 = integers).
 *
 * Direct-call tests:
 *   - Correct number of keys (rows × cols)
 *   - All values within [lower, upper)
 *   - precision=0 → all values are integers
 *   - precision=2 → all values have ≤2 decimal places
 *   - 1×1 output → single key "0-0"
 *   - Mixed-sign range
 *
 * Pipeline tests:
 *   - randMat(0, 10, 0, 2, 3) → 2×3 matrix, all values in [0, 10)
 *   - randMat(0, 1, 2, 3, 3) → 3×3 matrix, all in [0, 1) with ≤2 decimal places
 *
 * Note: randMat() is stochastic. Tests check structural invariants (size, range,
 * precision), not exact values.
 */

import { describe, it, expect } from "vitest";
import { randMat } from "../../functions/data/rand-mat";
import { runPipeline } from "../../pipeline";
import { ctx } from "../helpers";

// ── Direct call tests ──────────────────────────────────────────────────────────

describe("randMat — direct call: dimensions", () => {
  it("2×3 matrix → 6 keys", async () => {
    const r = await randMat([
      { "0-0": 0 }, { "0-0": 10 }, { "0-0": 0 }, { "0-0": 2 }, { "0-0": 3 },
    ], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(6);
    expect("0-0" in r).toBe(true);
    expect("0-1" in r).toBe(true);
    expect("0-2" in r).toBe(true);
    expect("1-0" in r).toBe(true);
    expect("1-1" in r).toBe(true);
    expect("1-2" in r).toBe(true);
  });

  it("1×1 matrix → single key '0-0'", async () => {
    const r = await randMat([
      { "0-0": 0 }, { "0-0": 5 }, { "0-0": 0 }, { "0-0": 1 }, { "0-0": 1 },
    ], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(1);
    expect("0-0" in r).toBe(true);
  });

  it("4×4 matrix → 16 keys", async () => {
    const r = await randMat([
      { "0-0": 0 }, { "0-0": 10 }, { "0-0": 0 }, { "0-0": 4 }, { "0-0": 4 },
    ], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(16);
  });
});

describe("randMat — direct call: non-negative range, precision=0 (integers)", () => {
  it("all values in [0, 10) and are integers", async () => {
    const r = await randMat([
      { "0-0": 0 }, { "0-0": 10 }, { "0-0": 0 }, { "0-0": 3 }, { "0-0": 3 },
    ], ctx("x=0"));
    for (const v of Object.values(r)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(10);
      expect(Number.isInteger(v)).toBe(true);
    }
  });
});

describe("randMat — direct call: precision=2", () => {
  it("3×3 matrix, all values in [0,1) with ≤2 decimal places", async () => {
    const r = await randMat([
      { "0-0": 0 }, { "0-0": 1 }, { "0-0": 2 }, { "0-0": 3 }, { "0-0": 3 },
    ], ctx("x=0"));
    for (const v of Object.values(r)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      expect(Math.round(v * 100)).toBeCloseTo(v * 100, 6);
    }
  });
});

describe("randMat — direct call: mixed-sign range", () => {
  it("all values in [-5, 5] for mixed range, precision=0", async () => {
    const r = await randMat([
      { "0-0": -5 }, { "0-0": 5 }, { "0-0": 0 }, { "0-0": 4 }, { "0-0": 4 },
    ], ctx("x=0"));
    for (const v of Object.values(r)) {
      expect(v).toBeGreaterThanOrEqual(-5);
      expect(v).toBeLessThanOrEqual(5);
      expect(Number.isInteger(v)).toBe(true);
    }
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("randMat — pipeline: 2×3 integer matrix", () => {
  it("randMat(0, 10, 0, 2, 3) → 6 values all in [0, 10)", async () => {
    const r = await runPipeline(ctx("x = randMat(0, 10, 0, 2, 3)"));
    expect(r.errors).toHaveLength(0);
    const real = r.solution.real;
    // Check at least the structural keys exist
    expect("0-0" in real).toBe(true);
    expect("1-2" in real).toBe(true);
    for (const v of Object.values(real)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(10);
    }
  });
});

describe("randMat — pipeline: precision=2", () => {
  it("randMat(0, 1, 2, 2, 2) → 4 values in [0,1) with ≤2 decimal places", async () => {
    const r = await runPipeline(ctx("x = randMat(0, 1, 2, 2, 2)"));
    expect(r.errors).toHaveLength(0);
    const real = r.solution.real;
    expect("0-0" in real).toBe(true);
    expect("1-1" in real).toBe(true);
    for (const v of Object.values(real)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      expect(Math.round(v * 100)).toBeCloseTo(v * 100, 6);
    }
  });
});

describe("randMat — pipeline: 1×1 → scalar", () => {
  it("randMat(3, 7, 0, 1, 1) → single integer in [3, 7)", async () => {
    const r = await runPipeline(ctx("x = randMat(3, 7, 0, 1, 1)"));
    expect(r.errors).toHaveLength(0);
    const v = r.solution.real["0-0"];
    expect(v).toBeGreaterThanOrEqual(3);
    expect(v).toBeLessThan(7);
    expect(Number.isInteger(v)).toBe(true);
  });
});
