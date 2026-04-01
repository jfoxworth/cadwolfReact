/**
 * Tests for solve() — solver/functions/linear-algebra/solve.ts
 * solve(A, b) — solves the linear system A*x = b via Gaussian elimination with partial pivoting.
 * A must be square (n×n); b must be n×1. Returns an n×1 column vector x.
 */

import { describe, it, expect } from "vitest";
import { solve } from "../../functions/linear-algebra/solve";
import { ctx } from "../helpers";

// ── Direct call tests ──────────────────────────────────────────────────────────

describe("solve — direct call: 1×1 system", () => {
  it("2x = 6 → x = 3", async () => {
    const A = { "0-0": 2 };
    const b = { "0-0": 6 };
    const r = await solve([A, b], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(3, 8);
  });

  it("0.5x = 1 → x = 2", async () => {
    const A = { "0-0": 0.5 };
    const b = { "0-0": 1 };
    const r = await solve([A, b], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(2, 8);
  });
});

describe("solve — direct call: 2×2 systems", () => {
  it("identity system: Ix = b → x = b", async () => {
    const A = { "0-0": 1, "0-1": 0, "1-0": 0, "1-1": 1 };
    const b = { "0-0": 3, "1-0": 7 };
    const r = await solve([A, b], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(3, 8);
    expect(r["1-0"]).toBeCloseTo(7, 8);
  });

  it("x + y = 5, x - y = 1 → x=3, y=2", async () => {
    const A = { "0-0": 1, "0-1": 1, "1-0": 1, "1-1": -1 };
    const b = { "0-0": 5, "1-0": 1 };
    const r = await solve([A, b], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(3, 6);
    expect(r["1-0"]).toBeCloseTo(2, 6);
  });

  it("2x + 3y = 8, 5x - y = 2 → verify A*x ≈ b", async () => {
    const A = { "0-0": 2, "0-1": 3, "1-0": 5, "1-1": -1 };
    const b = { "0-0": 8, "1-0": 2 };
    const r = await solve([A, b], ctx("x=0"));
    // Verify by substituting back
    const x0 = r["0-0"];
    const x1 = r["1-0"];
    expect(2 * x0 + 3 * x1).toBeCloseTo(8, 6);
    expect(5 * x0 - 1 * x1).toBeCloseTo(2, 6);
  });
});

describe("solve — direct call: 3×3 systems", () => {
  it("solves 3×3 diagonal system", async () => {
    const A = {
      "0-0": 2, "0-1": 0, "0-2": 0,
      "1-0": 0, "1-1": 3, "1-2": 0,
      "2-0": 0, "2-1": 0, "2-2": 4,
    };
    const b = { "0-0": 6, "1-0": 9, "2-0": 8 };
    const r = await solve([A, b], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(3, 6);
    expect(r["1-0"]).toBeCloseTo(3, 6);
    expect(r["2-0"]).toBeCloseTo(2, 6);
  });

  it("dense 3×3: verifies A*x ≈ b", async () => {
    const A = {
      "0-0": 1, "0-1": 2, "0-2": 3,
      "1-0": 4, "1-1": 5, "1-2": 6,
      "2-0": 7, "2-1": 8, "2-2": 10,  // singular-free: det ≠ 0
    };
    const b = { "0-0": 14, "1-0": 32, "2-0": 53 };
    const r = await solve([A, b], ctx("x=0"));
    const x = [r["0-0"], r["1-0"], r["2-0"]];
    // Verify: Ax ≈ b
    expect(1*x[0] + 2*x[1] + 3*x[2]).toBeCloseTo(14, 5);
    expect(4*x[0] + 5*x[1] + 6*x[2]).toBeCloseTo(32, 5);
    expect(7*x[0] + 8*x[1] + 10*x[2]).toBeCloseTo(53, 5);
  });
});

describe("solve — direct call: result is a column vector", () => {
  it("result keys are of the form 'i-0'", async () => {
    const A = { "0-0": 1, "0-1": 0, "1-0": 0, "1-1": 1 };
    const b = { "0-0": 5, "1-0": 3 };
    const r = await solve([A, b], ctx("x=0"));
    expect("0-0" in r).toBe(true);
    expect("1-0" in r).toBe(true);
    expect("0-1" in r).toBe(false);
  });
});

describe("solve — direct call: edge cases", () => {
  it("empty A → returns {0-0: 0}", async () => {
    const r = await solve([{}, {}], ctx("x=0"));
    expect(r["0-0"]).toBe(0);
  });
});
