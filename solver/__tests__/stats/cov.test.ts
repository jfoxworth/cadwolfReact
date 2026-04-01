import { describe, it, expect } from "vitest";
import { cov } from "../../functions/stats/cov";
import { ctx } from "../helpers";

describe("cov — direct call: two vectors", () => {
  it("cov([1,2,3],[1,2,3]) = variance of [1,2,3] = 1", async () => {
    const v = { "0-0": 1, "0-1": 2, "0-2": 3 };
    const r = await cov([v, v], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 8);
  });

  it("cov([1,2],[2,4]) = 1 (positive covariance)", async () => {
    const x = { "0-0": 1, "0-1": 2 };
    const y = { "0-0": 2, "0-1": 4 };
    const r = await cov([x, y], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 8);
  });

  it("cov([1,2],[-1,-2]) = -0.5 (negative covariance)", async () => {
    // mx=1.5, my=-1.5; sum((xi-mx)(yi-my))/(n-1) = ((-0.5)(0.5)+(0.5)(-0.5))/1 = -0.5
    const x = { "0-0": 1, "0-1": 2 };
    const y = { "0-0": -1, "0-1": -2 };
    const r = await cov([x, y], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-0.5, 8);
  });
});

describe("cov — direct call: one vector (variance)", () => {
  it("cov([1,2,3]) = 1 (sample variance)", async () => {
    const r = await cov([{ "0-0": 1, "0-1": 2, "0-2": 3 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 8);
  });

  it("cov([2,4,6]) = 4", async () => {
    const r = await cov([{ "0-0": 2, "0-1": 4, "0-2": 6 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(4, 8);
  });
});

describe("cov — edge cases", () => {
  it("n < 2 → NaN", async () => {
    const r = await cov([{ "0-0": 5 }], ctx("x=0"));
    expect(r["0-0"]).toBeNaN();
  });
});
