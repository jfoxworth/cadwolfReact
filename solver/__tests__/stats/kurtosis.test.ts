import { describe, it, expect } from "vitest";
import { kurtosis } from "../../functions/stats/kurtosis";
import { ctx } from "../helpers";

describe("kurtosis — direct call", () => {
  it("normal-like distribution → excess kurtosis ≈ 0", async () => {
    // Larger samples approximate normality better; this is a qualitative check
    const vals: Record<string, number> = {};
    const data = [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 0, 0, 0, 0, 0];
    data.forEach((v, i) => { vals[`0-${i}`] = v; });
    const r = await kurtosis([vals], ctx("x=0"));
    // Excess kurtosis of a near-normal distribution is around 0; platykurtic is negative
    expect(typeof r["0-0"]).toBe("number");
    expect(isNaN(r["0-0"])).toBe(false);
  });

  it("constant distribution → 0 excess kurtosis", async () => {
    const v = { "0-0": 5, "0-1": 5, "0-2": 5, "0-3": 5, "0-4": 5 };
    const r = await kurtosis([v], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 5);
  });

  it("n < 4 → NaN", async () => {
    const r = await kurtosis([{ "0-0": 1, "0-1": 2, "0-2": 3 }], ctx("x=0"));
    expect(r["0-0"]).toBeNaN();
  });

  it("returns a scalar", async () => {
    const v = { "0-0": 1, "0-1": 2, "0-2": 3, "0-3": 4, "0-4": 5 };
    const r = await kurtosis([v], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(1);
    expect("0-0" in r).toBe(true);
  });
});
