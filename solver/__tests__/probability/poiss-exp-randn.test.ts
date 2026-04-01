import { describe, it, expect } from "vitest";
import { poisscdf } from "../../functions/probability/poisscdf";
import { expcdf }   from "../../functions/probability/expcdf";
import { randn }    from "../../functions/probability/randn";

describe("poisscdf", () => {
  it("poisscdf(0, lambda) = e^{-lambda}", async () => {
    const lambda = 2;
    const r = await poisscdf([{ "0-0": 0 }, { "0-0": lambda }], {} as any);
    expect(r["0-0"]).toBeCloseTo(Math.exp(-lambda), 8);
  });

  it("poisscdf(-1, lambda) = 0", async () => {
    const r = await poisscdf([{ "0-0": -1 }, { "0-0": 3 }], {} as any);
    expect(r["0-0"]).toBe(0);
  });

  it("poisscdf(large k, lambda) ≈ 1", async () => {
    const r = await poisscdf([{ "0-0": 50 }, { "0-0": 2 }], {} as any);
    expect(r["0-0"]).toBeCloseTo(1, 8);
  });

  it("poisscdf(2, 1) = e^{-1}(1 + 1 + 0.5) ≈ 0.9197", async () => {
    // P(X<=2) = e^{-1}*(1 + 1 + 1/2) = 2.5/e
    const r = await poisscdf([{ "0-0": 2 }, { "0-0": 1 }], {} as any);
    expect(r["0-0"]).toBeCloseTo(2.5 * Math.exp(-1), 6);
  });
});

describe("expcdf", () => {
  it("expcdf(0, mu) = 0", async () => {
    const r = await expcdf([{ "0-0": 0 }, { "0-0": 2 }], {} as any);
    expect(r["0-0"]).toBe(0);
  });

  it("expcdf(negative, mu) = 0", async () => {
    const r = await expcdf([{ "0-0": -1 }, { "0-0": 2 }], {} as any);
    expect(r["0-0"]).toBe(0);
  });

  it("expcdf(mu, mu) = 1 - 1/e ≈ 0.6321", async () => {
    const mu = 3;
    const r = await expcdf([{ "0-0": mu }, { "0-0": mu }], {} as any);
    expect(r["0-0"]).toBeCloseTo(1 - Math.exp(-1), 8);
  });

  it("expcdf(x, 1) = 1 - e^{-x}", async () => {
    const x = 2;
    const r = await expcdf([{ "0-0": x }, { "0-0": 1 }], {} as any);
    expect(r["0-0"]).toBeCloseTo(1 - Math.exp(-x), 10);
  });
});

describe("randn", () => {
  it("returns a scalar by default (1 argument omitted)", async () => {
    const r = await randn([{ "0-0": 1 }], {} as any);
    expect(r["0-0"]).toBeDefined();
    expect(typeof r["0-0"]).toBe("number");
  });

  it("randn(3, 4) returns a 3×4 matrix", async () => {
    const r = await randn([{ "0-0": 3 }, { "0-0": 4 }], {} as any);
    expect(Object.keys(r).length).toBe(12);
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        expect(r[`${row}-${col}`]).toBeDefined();
      }
    }
  });

  it("large sample has mean ≈ 0 and std ≈ 1", async () => {
    const n = 1000;
    const r = await randn([{ "0-0": n }, { "0-0": 1 }], {} as any);
    const vals = Object.values(r);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((a, b) => a + b * b, 0) / vals.length - mean * mean;
    expect(mean).toBeCloseTo(0, 0);
    expect(Math.sqrt(variance)).toBeCloseTo(1, 0);
  });
});
