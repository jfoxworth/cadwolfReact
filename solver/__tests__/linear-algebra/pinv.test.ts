import { describe, it, expect } from "vitest";
import { pinv } from "../../functions/linear-algebra/pinv";

const EPS = 1e-8;

describe("pinv", () => {
  it("pinv(I) = I", async () => {
    const I = { "0-0": 1, "0-1": 0, "1-0": 0, "1-1": 1 };
    const r = await pinv([I], {} as any);
    expect(r["0-0"]).toBeCloseTo(1, 6);
    expect(r["0-1"]).toBeCloseTo(0, 6);
    expect(r["1-0"]).toBeCloseTo(0, 6);
    expect(r["1-1"]).toBeCloseTo(1, 6);
  });

  it("pinv of diagonal matrix = reciprocal diagonal", async () => {
    const D = { "0-0": 2, "0-1": 0, "1-0": 0, "1-1": 4 };
    const r = await pinv([D], {} as any);
    expect(r["0-0"]).toBeCloseTo(0.5, 6);
    expect(r["1-1"]).toBeCloseTo(0.25, 6);
  });

  // Pseudoinverse property: A * pinv(A) * A ≈ A (for tall matrix)
  it("A·pinv(A)·A ≈ A for tall 3×2 matrix", async () => {
    // A = [[1,2],[3,4],[5,6]]
    const A = { "0-0": 1, "0-1": 2, "1-0": 3, "1-1": 4, "2-0": 5, "2-1": 6 };
    const Ap = await pinv([A], {} as any); // 2×3

    // Compute A * Ap  (3×3)
    const AAp: Record<string, number> = {};
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        let s = 0;
        for (let k = 0; k < 2; k++) s += (A[`${i}-${k}`] ?? 0) * (Ap[`${k}-${j}`] ?? 0);
        AAp[`${i}-${j}`] = s;
      }
    }
    // Compute AAp * A  (3×2)
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 2; j++) {
        let s = 0;
        for (let k = 0; k < 3; k++) s += (AAp[`${i}-${k}`] ?? 0) * (A[`${k}-${j}`] ?? 0);
        expect(s).toBeCloseTo(A[`${i}-${j}`] ?? 0, 4);
      }
    }
  });

  it("pinv of fat 2×3 matrix satisfies A·pinv(A) ≈ I_m", async () => {
    const A = { "0-0": 1, "0-1": 0, "0-2": 1, "1-0": 0, "1-1": 1, "1-2": 1 };
    const Ap = await pinv([A], {} as any); // 3×2
    // A * Ap should be 2×2 identity
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        let s = 0;
        for (let k = 0; k < 3; k++) s += (A[`${i}-${k}`] ?? 0) * (Ap[`${k}-${j}`] ?? 0);
        expect(s).toBeCloseTo(i === j ? 1 : 0, 4);
      }
    }
  });
});
