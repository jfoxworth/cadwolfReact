/**
 * Tests for eig() — solver/functions/linear-algebra/eig.ts
 * Eigenvalues of a real symmetric matrix via Jacobi iteration.
 * Returns a row vector sorted descending by magnitude.
 */

import { describe, it, expect } from "vitest";
import { eig } from "../../functions/linear-algebra/eig";
import { ctx } from "../helpers";

// ── Direct call tests ──────────────────────────────────────────────────────────

describe("eig — direct call: 1×1 matrix", () => {
  it("[[5]] → eigenvalue 5", async () => {
    const r = await eig([{ "0-0": 5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(5, 6);
  });

  it("[[0]] → eigenvalue 0 (or just a scalar 0 return)", async () => {
    const r = await eig([{ "0-0": 0 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 6);
  });
});

describe("eig — direct call: 2×2 diagonal matrices", () => {
  it("diag(3, 7) → eigenvalues [7, 3] (sorted by magnitude desc)", async () => {
    const A = { "0-0": 3, "0-1": 0, "1-0": 0, "1-1": 7 };
    const r = await eig([A], ctx("x=0"));
    const vals = [r["0-0"], r["0-1"]].sort((a, b) => Math.abs(b) - Math.abs(a));
    expect(vals[0]).toBeCloseTo(7, 5);
    expect(vals[1]).toBeCloseTo(3, 5);
  });

  it("diag(1, -4) → eigenvalues sorted by |val| desc → [-4, 1]", async () => {
    const A = { "0-0": 1, "0-1": 0, "1-0": 0, "1-1": -4 };
    const r = await eig([A], ctx("x=0"));
    // Sorted by magnitude: |-4| > |1|
    expect(Math.abs(r["0-0"])).toBeGreaterThan(Math.abs(r["0-1"]));
    expect(r["0-0"]).toBeCloseTo(-4, 5);
    expect(r["0-1"]).toBeCloseTo(1, 5);
  });
});

describe("eig — direct call: 2×2 symmetric matrix", () => {
  it("[[3, 1],[1, 2]] → eigenvalues (5±√5)/2", async () => {
    // trace=5, det=5, λ=(5±√5)/2 ≈ 3.618, 1.382
    const A = { "0-0": 3, "0-1": 1, "1-0": 1, "1-1": 2 };
    const r = await eig([A], ctx("x=0"));
    const vals = [r["0-0"], r["0-1"]].sort((a, b) => b - a);
    expect(vals[0]).toBeCloseTo((5 + Math.sqrt(5)) / 2, 5);
    expect(vals[1]).toBeCloseTo((5 - Math.sqrt(5)) / 2, 5);
  });

  it("[[5, 2],[2, 3]] → eigenvalues 4±√5", async () => {
    // trace=8, det=11, λ=(8±√20)/2 = 4±√5 ≈ 6.236, 1.764
    const A = { "0-0": 5, "0-1": 2, "1-0": 2, "1-1": 3 };
    const r = await eig([A], ctx("x=0"));
    const vals = [r["0-0"], r["0-1"]].sort((a, b) => b - a);
    expect(vals[0]).toBeCloseTo(4 + Math.sqrt(5), 5);
    expect(vals[1]).toBeCloseTo(4 - Math.sqrt(5), 5);
  });
});

describe("eig — direct call: 3×3 symmetric matrix", () => {
  it("identity 3×3 → all eigenvalues = 1", async () => {
    const A = {
      "0-0": 1, "0-1": 0, "0-2": 0,
      "1-0": 0, "1-1": 1, "1-2": 0,
      "2-0": 0, "2-1": 0, "2-2": 1,
    };
    const r = await eig([A], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 5);
    expect(r["0-1"]).toBeCloseTo(1, 5);
    expect(r["0-2"]).toBeCloseTo(1, 5);
  });

  it("diag(5, 3, 1) → eigenvalues [5, 3, 1]", async () => {
    const A = {
      "0-0": 5, "0-1": 0, "0-2": 0,
      "1-0": 0, "1-1": 3, "1-2": 0,
      "2-0": 0, "2-1": 0, "2-2": 1,
    };
    const r = await eig([A], ctx("x=0"));
    // Sorted by magnitude desc → 5, 3, 1
    expect(r["0-0"]).toBeCloseTo(5, 5);
    expect(r["0-1"]).toBeCloseTo(3, 5);
    expect(r["0-2"]).toBeCloseTo(1, 5);
  });
});

describe("eig — direct call: result structure", () => {
  it("returns a row vector (all keys start with '0-')", async () => {
    const A = { "0-0": 2, "0-1": 1, "1-0": 1, "1-1": 2 };
    const r = await eig([A], ctx("x=0"));
    for (const k of Object.keys(r)) {
      expect(k.startsWith("0-")).toBe(true);
    }
  });

  it("n×n matrix → n eigenvalues", async () => {
    const A = { "0-0": 1, "0-1": 0, "1-0": 0, "1-1": 2 };
    const r = await eig([A], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(2);
  });
});

describe("eig — direct call: edge cases", () => {
  it("empty A → returns {0-0: 0}", async () => {
    const r = await eig([{}], ctx("x=0"));
    expect(r["0-0"]).toBe(0);
  });
});
