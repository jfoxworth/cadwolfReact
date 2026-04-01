import { describe, it, expect } from "vitest";
import { tcdf } from "../../functions/probability/tcdf";
import { tinv } from "../../functions/probability/tinv";

describe("tcdf", () => {
  it("tcdf(0, df) = 0.5 for any df (symmetric)", async () => {
    for (const df of [1, 2, 5, 30]) {
      const r = await tcdf([{ "0-0": 0 }, { "0-0": df }], {} as any);
      expect(r["0-0"]).toBeCloseTo(0.5, 6);
    }
  });

  it("tcdf is symmetric: tcdf(-t) = 1 - tcdf(t)", async () => {
    const r1 = await tcdf([{ "0-0": 2 }, { "0-0": 5 }], {} as any);
    const r2 = await tcdf([{ "0-0": -2 }, { "0-0": 5 }], {} as any);
    expect(r1["0-0"]! + r2["0-0"]!).toBeCloseTo(1, 8);
  });

  it("tcdf approaches normcdf as df → ∞", async () => {
    // tcdf(1.96, 1000) ≈ normcdf(1.96) ≈ 0.975
    const r = await tcdf([{ "0-0": 1.96 }, { "0-0": 1000 }], {} as any);
    expect(r["0-0"]).toBeCloseTo(0.975, 2);
  });

  it("tcdf(-Inf) ≈ 0, tcdf(+Inf) ≈ 1", async () => {
    const rLow  = await tcdf([{ "0-0": -1e10 }, { "0-0": 5 }], {} as any);
    const rHigh = await tcdf([{ "0-0":  1e10 }, { "0-0": 5 }], {} as any);
    expect(rLow["0-0"]).toBeCloseTo(0, 8);
    expect(rHigh["0-0"]).toBeCloseTo(1, 8);
  });
});

describe("tinv", () => {
  it("tinv(0.5, df) = 0 (median = 0)", async () => {
    const r = await tinv([{ "0-0": 0.5 }, { "0-0": 10 }], {} as any);
    expect(r["0-0"]).toBeCloseTo(0, 5);
  });

  it("tinv is inverse of tcdf", async () => {
    const p = 0.9;
    const df = 10;
    const t = await tinv([{ "0-0": p }, { "0-0": df }], {} as any);
    const back = await tcdf([{ "0-0": t["0-0"]! }, { "0-0": df }], {} as any);
    expect(back["0-0"]).toBeCloseTo(p, 5);
  });

  it("tinv(0.975, 30) ≈ 2.042 (standard t-table value)", async () => {
    const r = await tinv([{ "0-0": 0.975 }, { "0-0": 30 }], {} as any);
    expect(r["0-0"]).toBeCloseTo(2.042, 2);
  });
});
