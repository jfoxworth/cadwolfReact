/**
 * Tests for svd() — solver/functions/linear-algebra/svd.ts
 * Singular values of matrix A (sqrt of eigenvalues of A^T * A).
 * Returns a row vector sorted descending.
 */

import { describe, it, expect } from "vitest";
import { svd } from "../../functions/linear-algebra/svd";
import { ctx } from "../helpers";

// ── Direct call tests ──────────────────────────────────────────────────────────

describe("svd — direct call: 1×1 matrix", () => {
  it("[[3]] → singular value 3", async () => {
    const r = await svd([{ "0-0": 3 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(3, 6);
  });

  it("[[-5]] → singular value 5 (always non-negative)", async () => {
    const r = await svd([{ "0-0": -5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(5, 6);
  });
});

describe("svd — direct call: 2×2 diagonal matrices", () => {
  it("diag(3, 4) → singular values [4, 3] (sorted desc)", async () => {
    const A = { "0-0": 3, "0-1": 0, "1-0": 0, "1-1": 4 };
    const r = await svd([A], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(4, 5);
    expect(r["0-1"]).toBeCloseTo(3, 5);
  });

  it("diag(-2, 5) → singular values [5, 2]", async () => {
    const A = { "0-0": -2, "0-1": 0, "1-0": 0, "1-1": 5 };
    const r = await svd([A], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(5, 5);
    expect(r["0-1"]).toBeCloseTo(2, 5);
  });
});

describe("svd — direct call: identity matrices", () => {
  it("2×2 identity → all singular values = 1", async () => {
    const I2 = { "0-0": 1, "0-1": 0, "1-0": 0, "1-1": 1 };
    const r = await svd([I2], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 5);
    expect(r["0-1"]).toBeCloseTo(1, 5);
  });

  it("3×3 identity → all singular values = 1", async () => {
    const I3 = {
      "0-0": 1, "0-1": 0, "0-2": 0,
      "1-0": 0, "1-1": 1, "1-2": 0,
      "2-0": 0, "2-1": 0, "2-2": 1,
    };
    const r = await svd([I3], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 5);
    expect(r["0-1"]).toBeCloseTo(1, 5);
    expect(r["0-2"]).toBeCloseTo(1, 5);
  });
});

describe("svd — direct call: non-square matrices", () => {
  it("2×1 column vector [3;4] → single singular value 5", async () => {
    // [3;4] as 2×1: A^T*A = [[3,4]]*[[3],[4]] = [25] → sv = 5
    const A = { "0-0": 3, "1-0": 4 };
    const r = await svd([A], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(5, 5);
  });

  it("1×2 row vector [3,4] → single singular value 5", async () => {
    // A^T*A is 2×2 [[9,12],[12,16]] with eigenvalues 25 and 0
    const A = { "0-0": 3, "0-1": 4 };
    const r = await svd([A], ctx("x=0"));
    // Largest singular value should be 5
    expect(r["0-0"]).toBeCloseTo(5, 5);
  });
});

describe("svd — direct call: known 2×2 case", () => {
  it("[[3,4],[0,0]] → singular value 5 (and 0)", async () => {
    // A^T*A = [[9,12],[12,16]], trace=25, det=0, λ=25,0 → sv=5,0
    const A = { "0-0": 3, "0-1": 4, "1-0": 0, "1-1": 0 };
    const r = await svd([A], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(5, 5);
    expect(r["0-1"]).toBeCloseTo(0, 5);
  });
});

describe("svd — direct call: singular values are non-negative", () => {
  it("all returned values ≥ 0", async () => {
    const A = { "0-0": -3, "0-1": 2, "1-0": 1, "1-1": -4 };
    const r = await svd([A], ctx("x=0"));
    for (const v of Object.values(r)) {
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("svd — direct call: result structure", () => {
  it("n×n matrix → n singular values (row vector)", async () => {
    const A = { "0-0": 1, "0-1": 2, "1-0": 3, "1-1": 4 };
    const r = await svd([A], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(2);
    for (const k of Object.keys(r)) {
      expect(k.startsWith("0-")).toBe(true);
    }
  });

  it("sorted descending", async () => {
    const A = {
      "0-0": 1, "0-1": 0, "0-2": 0,
      "1-0": 0, "1-1": 3, "1-2": 0,
      "2-0": 0, "2-1": 0, "2-2": 2,
    };
    const r = await svd([A], ctx("x=0"));
    expect(r["0-0"]).toBeGreaterThanOrEqual(r["0-1"]);
    expect(r["0-1"]).toBeGreaterThanOrEqual(r["0-2"]);
  });
});

describe("svd — direct call: edge cases", () => {
  it("empty matrix → returns {0-0: 0}", async () => {
    const r = await svd([{}], ctx("x=0"));
    expect(r["0-0"]).toBe(0);
  });
});
