import { describe, it, expect } from "vitest";
import { skewness } from "../../functions/stats/skewness";
import { ctx } from "../helpers";

describe("skewness — direct call", () => {
  it("symmetric distribution → ≈ 0", async () => {
    const v = { "0-0": 1, "0-1": 2, "0-2": 3, "0-3": 4, "0-4": 5 };
    const r = await skewness([v], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 5);
  });

  it("right-skewed distribution → positive", async () => {
    // [1, 1, 1, 10] is right-skewed (long right tail)
    const v = { "0-0": 1, "0-1": 1, "0-2": 1, "0-3": 10 };
    const r = await skewness([v], ctx("x=0"));
    expect(r["0-0"]).toBeGreaterThan(0);
  });

  it("left-skewed distribution → negative", async () => {
    const v = { "0-0": -10, "0-1": -1, "0-2": -1, "0-3": -1 };
    const r = await skewness([v], ctx("x=0"));
    expect(r["0-0"]).toBeLessThan(0);
  });

  it("constant distribution → 0", async () => {
    const v = { "0-0": 5, "0-1": 5, "0-2": 5, "0-3": 5 };
    const r = await skewness([v], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 5);
  });

  it("n < 3 → NaN", async () => {
    const r = await skewness([{ "0-0": 1, "0-1": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBeNaN();
  });
});
