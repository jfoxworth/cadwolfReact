import { describe, it, expect } from "vitest";
import { rank } from "../../functions/linear-algebra/rank";

describe("rank", () => {
  it("identity matrix is full rank", async () => {
    const I = { "0-0": 1, "0-1": 0, "1-0": 0, "1-1": 1 };
    const r = await rank([I], {} as any);
    expect(r["0-0"]).toBe(2);
  });

  it("singular 2×2 matrix has rank 1", async () => {
    // [[1,2],[2,4]] — rows are proportional
    const A = { "0-0": 1, "0-1": 2, "1-0": 2, "1-1": 4 };
    const r = await rank([A], {} as any);
    expect(r["0-0"]).toBe(1);
  });

  it("zero matrix has rank 0", async () => {
    const A = { "0-0": 0, "0-1": 0, "1-0": 0, "1-1": 0 };
    const r = await rank([A], {} as any);
    expect(r["0-0"]).toBe(0);
  });

  it("full-rank 3×3 matrix", async () => {
    // [[1,0,0],[0,2,0],[0,0,3]]
    const A = { "0-0": 1, "0-1": 0, "0-2": 0, "1-0": 0, "1-1": 2, "1-2": 0, "2-0": 0, "2-1": 0, "2-2": 3 };
    const r = await rank([A], {} as any);
    expect(r["0-0"]).toBe(3);
  });

  it("rank-2 matrix in 3×3", async () => {
    // Third row = sum of first two
    const A = { "0-0": 1, "0-1": 0, "0-2": 0, "1-0": 0, "1-1": 1, "1-2": 0, "2-0": 1, "2-1": 1, "2-2": 0 };
    const r = await rank([A], {} as any);
    expect(r["0-0"]).toBe(2);
  });

  it("tall full-rank 3×2 matrix has rank 2", async () => {
    const A = { "0-0": 1, "0-1": 0, "1-0": 0, "1-1": 1, "2-0": 1, "2-1": 1 };
    const r = await rank([A], {} as any);
    expect(r["0-0"]).toBe(2);
  });
});
