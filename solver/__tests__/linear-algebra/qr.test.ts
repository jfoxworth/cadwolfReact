import { describe, it, expect } from "vitest";
import { qr } from "../../functions/linear-algebra/qr";

describe("qr", () => {
  it("Q columns are orthonormal for 3×2 matrix", async () => {
    const A = { "0-0": 1, "0-1": 0, "1-0": 0, "1-1": 1, "2-0": 1, "2-1": 1 };
    const Q = await qr([A], {} as any); // which=1 default
    // Q^T Q should be identity (2×2)
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        let dot = 0;
        for (let k = 0; k < 3; k++) dot += (Q[`${k}-${i}`] ?? 0) * (Q[`${k}-${j}`] ?? 0);
        expect(dot).toBeCloseTo(i === j ? 1 : 0, 8);
      }
    }
  });

  it("R is upper triangular", async () => {
    const A = { "0-0": 1, "0-1": 2, "1-0": 3, "1-1": 4 };
    const R = await qr([A, { "0-0": 2 }], {} as any);
    expect(R["1-0"]).toBeCloseTo(0, 10);
  });

  it("Q*R reconstructs A for square matrix", async () => {
    const A = { "0-0": 1, "0-1": 2, "1-0": 3, "1-1": 4 };
    const Q = await qr([A], {} as any);
    const R = await qr([A, { "0-0": 2 }], {} as any);
    // Compute Q*R
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        let s = 0;
        for (let k = 0; k < 2; k++) s += (Q[`${i}-${k}`] ?? 0) * (R[`${k}-${j}`] ?? 0);
        expect(s).toBeCloseTo(A[`${i}-${j}`] ?? 0, 8);
      }
    }
  });

  it("identity matrix gives Q=I, R=I", async () => {
    const I = { "0-0": 1, "0-1": 0, "1-0": 0, "1-1": 1 };
    const Q = await qr([I], {} as any);
    expect(Math.abs(Q["0-0"] ?? 0)).toBeCloseTo(1, 8);
    expect(Math.abs(Q["1-1"] ?? 0)).toBeCloseTo(1, 8);
    expect(Q["0-1"]).toBeCloseTo(0, 8);
    expect(Q["1-0"]).toBeCloseTo(0, 8);
  });
});
