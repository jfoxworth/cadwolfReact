import { describe, it, expect } from "vitest";
import { nonzero } from "../../functions/data/nonzero";

describe("nonzero", () => {
  it("finds nonzero indices in [0,1,0,2,0]", async () => {
    const r = await nonzero([{ "0-0": 0, "0-1": 1, "0-2": 0, "0-3": 2, "0-4": 0 }], {} as any);
    expect(r["0-0"]).toBe(1);
    expect(r["0-1"]).toBe(3);
    expect(Object.keys(r).length).toBe(2);
  });

  it("all nonzero — all indices returned", async () => {
    const r = await nonzero([{ "0-0": 1, "0-1": 2, "0-2": 3 }], {} as any);
    expect(r["0-0"]).toBe(0);
    expect(r["0-1"]).toBe(1);
    expect(r["0-2"]).toBe(2);
  });

  it("all zeros — returns empty", async () => {
    const r = await nonzero([{ "0-0": 0, "0-1": 0 }], {} as any);
    expect(Object.keys(r).length).toBe(0);
  });

  it("single nonzero", async () => {
    const r = await nonzero([{ "0-0": 0, "0-1": 0, "0-2": 5 }], {} as any);
    expect(r["0-0"]).toBe(2);
    expect(Object.keys(r).length).toBe(1);
  });

  it("empty matrix returns empty", async () => {
    const r = await nonzero([{}], {} as any);
    expect(Object.keys(r).length).toBe(0);
  });
});
