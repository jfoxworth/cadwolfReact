import { describe, it, expect } from "vitest";
import { fcdf } from "../../functions/probability/fcdf";
import { finv } from "../../functions/probability/finv";

describe("fcdf", () => {
  it("fcdf(0, d1, d2) = 0", async () => {
    const r = await fcdf([{ "0-0": 0 }, { "0-0": 5 }, { "0-0": 10 }], {} as any);
    expect(r["0-0"]).toBe(0);
  });

  it("fcdf(negative, d1, d2) = 0", async () => {
    const r = await fcdf([{ "0-0": -1 }, { "0-0": 2 }, { "0-0": 5 }], {} as any);
    expect(r["0-0"]).toBe(0);
  });

  it("fcdf(3.326, 5, 10) ≈ 0.95 (standard F-table value)", async () => {
    // F(0.95; 5, 10) = 3.326 per standard tables
    const r = await fcdf([{ "0-0": 3.326 }, { "0-0": 5 }, { "0-0": 10 }], {} as any);
    expect(r["0-0"]).toBeCloseTo(0.95, 2);
  });

  it("fcdf is monotone increasing", async () => {
    const r1 = await fcdf([{ "0-0": 1 }, { "0-0": 3 }, { "0-0": 5 }], {} as any);
    const r2 = await fcdf([{ "0-0": 5 }, { "0-0": 3 }, { "0-0": 5 }], {} as any);
    expect(r2["0-0"]!).toBeGreaterThan(r1["0-0"]!);
  });
});

describe("finv", () => {
  it("finv is inverse of fcdf", async () => {
    const p = 0.9;
    const x = await finv([{ "0-0": p }, { "0-0": 3 }, { "0-0": 8 }], {} as any);
    const back = await fcdf([{ "0-0": x["0-0"]! }, { "0-0": 3 }, { "0-0": 8 }], {} as any);
    expect(back["0-0"]).toBeCloseTo(p, 5);
  });

  it("finv(0, d1, d2) = 0", async () => {
    const r = await finv([{ "0-0": 0 }, { "0-0": 5 }, { "0-0": 10 }], {} as any);
    expect(r["0-0"]).toBe(0);
  });
});
