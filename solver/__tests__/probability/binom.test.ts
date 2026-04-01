import { describe, it, expect } from "vitest";
import { binopdf } from "../../functions/probability/binopdf";
import { binocdf } from "../../functions/probability/binocdf";

describe("binopdf", () => {
  it("binopdf(0, 10, 0.5) = (0.5)^10", async () => {
    const r = await binopdf([{ "0-0": 0 }, { "0-0": 10 }, { "0-0": 0.5 }], {} as any);
    expect(r["0-0"]).toBeCloseTo(Math.pow(0.5, 10), 10);
  });

  it("binopdf(5, 10, 0.5) is the max probability at the mean", async () => {
    const r = await binopdf([{ "0-0": 5 }, { "0-0": 10 }, { "0-0": 0.5 }], {} as any);
    expect(r["0-0"]).toBeCloseTo(0.24609375, 8);
  });

  it("probabilities sum to 1 for n=4, p=0.3", async () => {
    let total = 0;
    for (let k = 0; k <= 4; k++) {
      const r = await binopdf([{ "0-0": k }, { "0-0": 4 }, { "0-0": 0.3 }], {} as any);
      total += r["0-0"] ?? 0;
    }
    expect(total).toBeCloseTo(1, 8);
  });

  it("binopdf(k > n) = 0", async () => {
    const r = await binopdf([{ "0-0": 5 }, { "0-0": 3 }, { "0-0": 0.5 }], {} as any);
    expect(r["0-0"]).toBe(0);
  });
});

describe("binocdf", () => {
  it("binocdf(n, n, p) = 1", async () => {
    const r = await binocdf([{ "0-0": 10 }, { "0-0": 10 }, { "0-0": 0.4 }], {} as any);
    expect(r["0-0"]).toBeCloseTo(1, 8);
  });

  it("binocdf(-1, n, p) = 0", async () => {
    const r = await binocdf([{ "0-0": -1 }, { "0-0": 5 }, { "0-0": 0.5 }], {} as any);
    expect(r["0-0"]).toBe(0);
  });

  it("binocdf(k, n, p) matches sum of binopdf", async () => {
    const n = 8, p = 0.4, k = 3;
    let sum = 0;
    for (let i = 0; i <= k; i++) {
      const r = await binopdf([{ "0-0": i }, { "0-0": n }, { "0-0": p }], {} as any);
      sum += r["0-0"] ?? 0;
    }
    const cdf = await binocdf([{ "0-0": k }, { "0-0": n }, { "0-0": p }], {} as any);
    expect(cdf["0-0"]).toBeCloseTo(sum, 6);
  });
});
