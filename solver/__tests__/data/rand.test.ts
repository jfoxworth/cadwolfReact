/**
 * Tests for rand() — solver/functions/data/rand.ts
 *
 * Formula: rand(lower, upper, precision)
 *   Returns a single random number in [lower, upper).
 *   precision = decimal places (0 = integers, 2 = hundredths, etc.)
 *
 * Direct-call tests:
 *   - Output is always within [lower, upper)
 *   - precision=0 → output is an integer (no fractional part)
 *   - precision=2 → output has at most 2 decimal places
 *   - lower=0, upper=1 (wide open) → value ∈ [0, 1)
 *   - negative lower → value ∈ [lower, upper)
 *   - lower = upper → implementation-defined (edge, not tested for exact)
 *
 * Pipeline tests:
 *   - rand(0, 10, 0) → integer in [0, 10)
 *   - rand(0, 1, 2) → value in [0, 1) with ≤2 decimal places
 *   - rand(-5, 5, 0) → integer in [-5, 5]
 *
 * Note: rand() is stochastic. Tests run multiple trials or check range invariants,
 * not exact values.
 */

import { describe, it, expect } from "vitest";
import { rand } from "../../functions/data/rand";
import { runPipeline } from "../../pipeline";
import { ctx } from "../helpers";

const TRIALS = 50;

// ── Direct call tests ──────────────────────────────────────────────────────────

describe("rand — direct call: non-negative range, precision=0", () => {
  it("rand(0, 10, 0) → integer in [0, 10) over multiple trials", async () => {
    for (let i = 0; i < TRIALS; i++) {
      const r = await rand([{ "0-0": 0 }, { "0-0": 10 }, { "0-0": 0 }], ctx("x=0"));
      const v = r["0-0"] ?? -1;
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(10);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it("rand(1, 6, 0) → integer in [1, 6) over multiple trials", async () => {
    for (let i = 0; i < TRIALS; i++) {
      const r = await rand([{ "0-0": 1 }, { "0-0": 6 }, { "0-0": 0 }], ctx("x=0"));
      const v = r["0-0"] ?? -1;
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThan(6);
      expect(Number.isInteger(v)).toBe(true);
    }
  });
});

describe("rand — direct call: non-negative range, precision=2", () => {
  it("rand(0, 1, 2) → value in [0, 1) with ≤2 decimal places", async () => {
    for (let i = 0; i < TRIALS; i++) {
      const r = await rand([{ "0-0": 0 }, { "0-0": 1 }, { "0-0": 2 }], ctx("x=0"));
      const v = r["0-0"] ?? -1;
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      // Precision check: v * 100 should be (close to) an integer
      expect(Math.round(v * 100)).toBeCloseTo(v * 100, 6);
    }
  });
});

describe("rand — direct call: mixed-sign range, precision=0", () => {
  it("rand(-5, 5, 0) → integer, trials stay within [-5, 5]", async () => {
    for (let i = 0; i < TRIALS; i++) {
      const r = await rand([{ "0-0": -5 }, { "0-0": 5 }, { "0-0": 0 }], ctx("x=0"));
      const v = r["0-0"] ?? 999;
      expect(v).toBeGreaterThanOrEqual(-5);
      expect(v).toBeLessThanOrEqual(5);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it("rand(-10, 0, 0) → non-positive integer", async () => {
    for (let i = 0; i < TRIALS; i++) {
      const r = await rand([{ "0-0": -10 }, { "0-0": 0 }, { "0-0": 0 }], ctx("x=0"));
      const v = r["0-0"] ?? 1;
      expect(v).toBeGreaterThanOrEqual(-10);
      expect(v).toBeLessThanOrEqual(0);
      expect(Number.isInteger(v)).toBe(true);
    }
  });
});

describe("rand — direct call: returns a single scalar", () => {
  it("output has exactly one key '0-0'", async () => {
    const r = await rand([{ "0-0": 0 }, { "0-0": 10 }, { "0-0": 0 }], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(1);
    expect("0-0" in r).toBe(true);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("rand — pipeline: integer range", () => {
  it("rand(0, 10, 0) → integer in [0, 10) over multiple trials", async () => {
    for (let i = 0; i < 10; i++) {
      const r = await runPipeline(ctx("x = rand(0, 10, 0)"));
      expect(r.errors).toHaveLength(0);
      const v = r.solution.real["0-0"];
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(10);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it("rand(-5, 5, 0) → integer in [-5, 5]", async () => {
    for (let i = 0; i < 10; i++) {
      const r = await runPipeline(ctx("x = rand(-5, 5, 0)"));
      expect(r.errors).toHaveLength(0);
      const v = r.solution.real["0-0"];
      expect(v).toBeGreaterThanOrEqual(-5);
      expect(v).toBeLessThanOrEqual(5);
    }
  });
});

describe("rand — pipeline: precision", () => {
  it("rand(0, 1, 2) → value ∈ [0, 1) with ≤2 decimal places", async () => {
    for (let i = 0; i < 10; i++) {
      const r = await runPipeline(ctx("x = rand(0, 1, 2)"));
      expect(r.errors).toHaveLength(0);
      const v = r.solution.real["0-0"];
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      expect(Math.round(v * 100)).toBeCloseTo(v * 100, 6);
    }
  });
});
