import { describe, it, expect } from "vitest";
import { lstsq } from "../../functions/linear-algebra/lstsq";

describe("lstsq", () => {
  it("exact solution when A is square full-rank", async () => {
    // A = [[2,1],[1,3]], b = [5,10] → x = [1,3]
    const A = { "0-0": 2, "0-1": 1, "1-0": 1, "1-1": 3 };
    const b = { "0-0": 5, "1-0": 10 };
    const r = await lstsq([A, b], {} as any);
    expect(r["0-0"]).toBeCloseTo(1, 4);
    expect(r["1-0"]).toBeCloseTo(3, 4);
  });

  it("least-squares fit for overdetermined system (3 eqs, 2 unknowns)", async () => {
    // A = [[1,1],[1,2],[1,3]], b = [2,3,4] — perfect fit for x=[1,1]
    const A = { "0-0": 1, "0-1": 1, "1-0": 1, "1-1": 2, "2-0": 1, "2-1": 3 };
    const b = { "0-0": 2, "1-0": 3, "2-0": 4 };
    const r = await lstsq([A, b], {} as any);
    expect(r["0-0"]).toBeCloseTo(1, 4);
    expect(r["1-0"]).toBeCloseTo(1, 4);
  });

  it("identity matrix — solution equals b", async () => {
    const I = { "0-0": 1, "0-1": 0, "1-0": 0, "1-1": 1 };
    const b = { "0-0": 3, "1-0": 7 };
    const r = await lstsq([I, b], {} as any);
    expect(r["0-0"]).toBeCloseTo(3, 6);
    expect(r["1-0"]).toBeCloseTo(7, 6);
  });

  it("b as row vector is accepted", async () => {
    const A = { "0-0": 1, "0-1": 0, "1-0": 0, "1-1": 2 };
    const b = { "0-0": 4, "0-1": 6 }; // row vector format
    const r = await lstsq([A, b], {} as any);
    expect(r["0-0"]).toBeCloseTo(4, 4);
    expect(r["1-0"]).toBeCloseTo(3, 4);
  });
});
