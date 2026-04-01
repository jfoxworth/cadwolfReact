import { describe, it, expect } from "vitest";
import { prod } from "../../functions/stats/prod";

describe("prod", () => {
  it("product of a row vector", async () => {
    const r = await prod([{ "0-0": 2, "0-1": 3, "0-2": 4 }], {} as any);
    expect(r["0-0"]).toBeCloseTo(24, 10);
  });

  it("product of a column vector", async () => {
    const r = await prod([{ "0-0": 2, "1-0": 5, "2-0": 3 }], {} as any);
    expect(r["0-0"]).toBeCloseTo(30, 10);
  });

  it("single element", async () => {
    const r = await prod([{ "0-0": 7 }], {} as any);
    expect(r["0-0"]).toBeCloseTo(7, 10);
  });

  it("empty matrix returns 1 (identity for multiplication)", async () => {
    const r = await prod([{}], {} as any);
    expect(r["0-0"]).toBe(1);
  });

  it("product containing zero is zero", async () => {
    const r = await prod([{ "0-0": 3, "0-1": 0, "0-2": 5 }], {} as any);
    expect(r["0-0"]).toBe(0);
  });

  it("negative values", async () => {
    const r = await prod([{ "0-0": -2, "0-1": 3, "0-2": -4 }], {} as any);
    expect(r["0-0"]).toBeCloseTo(24, 10);
  });
});
