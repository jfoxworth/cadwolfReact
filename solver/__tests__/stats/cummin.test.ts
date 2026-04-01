import { describe, it, expect } from "vitest";
import { cummin } from "../../functions/stats/cummin";

describe("cummin", () => {
  it("running minimum of ascending vector", async () => {
    const x = { "0-0": 1, "0-1": 2, "0-2": 3, "0-3": 4 };
    const r = await cummin([x], {} as any);
    expect(r["0-0"]).toBe(1);
    expect(r["0-1"]).toBe(1);
    expect(r["0-2"]).toBe(1);
    expect(r["0-3"]).toBe(1);
  });

  it("running minimum of descending vector", async () => {
    const x = { "0-0": 4, "0-1": 3, "0-2": 2, "0-3": 1 };
    const r = await cummin([x], {} as any);
    expect(r["0-0"]).toBe(4);
    expect(r["0-1"]).toBe(3);
    expect(r["0-2"]).toBe(2);
    expect(r["0-3"]).toBe(1);
  });

  it("running minimum with negative values", async () => {
    const x = { "0-0": 3, "0-1": -1, "0-2": 2, "0-3": -5, "0-4": 0 };
    const r = await cummin([x], {} as any);
    expect(r["0-0"]).toBe(3);
    expect(r["0-1"]).toBe(-1);
    expect(r["0-2"]).toBe(-1);
    expect(r["0-3"]).toBe(-5);
    expect(r["0-4"]).toBe(-5);
  });

  it("scalar input returns itself", async () => {
    const x = { "0-0": 7 };
    const r = await cummin([x], {} as any);
    expect(r["0-0"]).toBe(7);
  });

  it("empty input returns empty", async () => {
    const r = await cummin([{}], {} as any);
    expect(Object.keys(r).length).toBe(0);
  });
});
