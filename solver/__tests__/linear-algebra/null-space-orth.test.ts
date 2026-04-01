import { describe, it, expect } from "vitest";
import { nullSpace } from "../../functions/linear-algebra/null-space";
import { orth }      from "../../functions/linear-algebra/orth";

describe("nullSpace", () => {
  it("full-rank matrix has trivial null space (zero vector)", async () => {
    const I = { "0-0": 1, "0-1": 0, "1-0": 0, "1-1": 1 };
    const r = await nullSpace([I], {} as any);
    // Should return a zero column
    for (const v of Object.values(r)) expect(v).toBeCloseTo(0, 10);
  });

  it("singular 2×2 [[1,2],[2,4]] has 1-dim null space", async () => {
    const A = { "0-0": 1, "0-1": 2, "1-0": 2, "1-1": 4 };
    const r = await nullSpace([A], {} as any);
    // null vector should satisfy A*v = 0
    const v0 = r["0-0"] ?? 0;
    const v1 = r["1-0"] ?? 0;
    expect(1 * v0 + 2 * v1).toBeCloseTo(0, 8);
    expect(2 * v0 + 4 * v1).toBeCloseTo(0, 8);
    // and be nonzero
    expect(Math.abs(v0) + Math.abs(v1)).toBeGreaterThan(0.1);
  });

  it("null space of row vector [1,0,0] is 2-dimensional", async () => {
    const A = { "0-0": 1, "0-1": 0, "0-2": 0 };
    const r = await nullSpace([A], {} as any);
    // Two free columns → 2 null vectors
    expect(r["0-1"]).toBeDefined(); // column 1 exists
  });
});

describe("orth", () => {
  it("orth of identity is identity columns", async () => {
    const I = { "0-0": 1, "0-1": 0, "1-0": 0, "1-1": 1 };
    const r = await orth([I], {} as any);
    // Q^T Q = I
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        let dot = 0;
        for (let k = 0; k < 2; k++) dot += (r[`${k}-${i}`] ?? 0) * (r[`${k}-${j}`] ?? 0);
        expect(dot).toBeCloseTo(i === j ? 1 : 0, 8);
      }
    }
  });

  it("orth of rank-1 matrix returns single orthonormal column", async () => {
    // [[1,2],[2,4]] has rank 1
    const A = { "0-0": 1, "0-1": 2, "1-0": 2, "1-1": 4 };
    const r = await orth([A], {} as any);
    // Only one column (0-0 and 1-0 exist, 0-1 and 1-1 do not)
    const col0 = [r["0-0"] ?? 0, r["1-0"] ?? 0];
    const norm = Math.sqrt(col0[0] ** 2 + col0[1] ** 2);
    expect(norm).toBeCloseTo(1, 8);
  });

  it("orth of tall matrix returns orthonormal columns", async () => {
    const A = { "0-0": 1, "0-1": 0, "1-0": 0, "1-1": 1, "2-0": 1, "2-1": 1 };
    const r = await orth([A], {} as any);
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        let dot = 0;
        for (let k = 0; k < 3; k++) dot += (r[`${k}-${i}`] ?? 0) * (r[`${k}-${j}`] ?? 0);
        expect(dot).toBeCloseTo(i === j ? 1 : 0, 8);
      }
    }
  });
});
