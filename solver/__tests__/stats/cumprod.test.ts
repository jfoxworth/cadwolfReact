import { describe, it, expect } from "vitest";
import { cumprod } from "../../functions/stats/cumprod";

describe("cumprod", () => {
  it("cumulative product of [1,2,3,4]", async () => {
    const r = await cumprod([{ "0-0": 1, "0-1": 2, "0-2": 3, "0-3": 4 }], {} as any);
    expect(r["0-0"]).toBeCloseTo(1, 10);
    expect(r["0-1"]).toBeCloseTo(2, 10);
    expect(r["0-2"]).toBeCloseTo(6, 10);
    expect(r["0-3"]).toBeCloseTo(24, 10);
  });

  it("preserves shape for column vector", async () => {
    const r = await cumprod([{ "0-0": 2, "1-0": 3, "2-0": 5 }], {} as any);
    expect(r["0-0"]).toBeCloseTo(2, 10);
    expect(r["1-0"]).toBeCloseTo(6, 10);
    expect(r["2-0"]).toBeCloseTo(30, 10);
  });

  it("single element unchanged", async () => {
    const r = await cumprod([{ "0-0": 7 }], {} as any);
    expect(r["0-0"]).toBeCloseTo(7, 10);
  });

  it("empty matrix returns empty", async () => {
    const r = await cumprod([{}], {} as any);
    expect(Object.keys(r).length).toBe(0);
  });

  it("element after zero stays zero", async () => {
    const r = await cumprod([{ "0-0": 3, "0-1": 0, "0-2": 5 }], {} as any);
    expect(r["0-1"]).toBe(0);
    expect(r["0-2"]).toBe(0);
  });
});
