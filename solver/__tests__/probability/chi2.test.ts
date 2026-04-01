import { describe, it, expect } from "vitest";
import { chi2cdf } from "../../functions/probability/chi2cdf";
import { chi2inv } from "../../functions/probability/chi2inv";

describe("chi2cdf", () => {
  it("chi2cdf(0, k) = 0", async () => {
    const r = await chi2cdf([{ "0-0": 0 }, { "0-0": 5 }], {} as any);
    expect(r["0-0"]).toBe(0);
  });

  it("chi2cdf(negative, k) = 0", async () => {
    const r = await chi2cdf([{ "0-0": -1 }, { "0-0": 5 }], {} as any);
    expect(r["0-0"]).toBe(0);
  });

  it("chi2cdf(k, k) ≈ 0.5 for large k (mean = k)", async () => {
    // Median ≈ k*(1 - 2/(9k))^3 ≈ k for large k; rough check at mean
    const r = await chi2cdf([{ "0-0": 10 }, { "0-0": 10 }], {} as any);
    expect(r["0-0"]).toBeGreaterThan(0.4);
    expect(r["0-0"]).toBeLessThan(0.7);
  });

  it("chi2cdf(3.841, 1) ≈ 0.95 (standard chi2 table)", async () => {
    const r = await chi2cdf([{ "0-0": 3.841 }, { "0-0": 1 }], {} as any);
    expect(r["0-0"]).toBeCloseTo(0.95, 3);
  });

  it("chi2cdf(18.307, 10) ≈ 0.95", async () => {
    const r = await chi2cdf([{ "0-0": 18.307 }, { "0-0": 10 }], {} as any);
    expect(r["0-0"]).toBeCloseTo(0.95, 3);
  });
});

describe("chi2inv", () => {
  it("chi2inv is inverse of chi2cdf", async () => {
    const p = 0.9;
    const k = 5;
    const x = await chi2inv([{ "0-0": p }, { "0-0": k }], {} as any);
    const back = await chi2cdf([{ "0-0": x["0-0"]! }, { "0-0": k }], {} as any);
    expect(back["0-0"]).toBeCloseTo(p, 5);
  });

  it("chi2inv(0.95, 1) ≈ 3.841", async () => {
    const r = await chi2inv([{ "0-0": 0.95 }, { "0-0": 1 }], {} as any);
    expect(r["0-0"]).toBeCloseTo(3.841, 2);
  });

  it("chi2inv(0, k) = 0", async () => {
    const r = await chi2inv([{ "0-0": 0 }, { "0-0": 5 }], {} as any);
    expect(r["0-0"]).toBe(0);
  });
});
