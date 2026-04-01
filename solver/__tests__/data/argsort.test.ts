import { describe, it, expect } from "vitest";
import { argsort } from "../../functions/data/argsort";

describe("argsort", () => {
  it("ascending sort of [3,1,2]", async () => {
    const r = await argsort([{ "0-0": 3, "0-1": 1, "0-2": 2 }], {} as any);
    // sorted order: idx 1 (val 1), idx 2 (val 2), idx 0 (val 3)
    expect(r["0-0"]).toBe(1);
    expect(r["0-1"]).toBe(2);
    expect(r["0-2"]).toBe(0);
  });

  it("descending sort of [3,1,2]", async () => {
    const r = await argsort([{ "0-0": 3, "0-1": 1, "0-2": 2 }, { "0-0": -1 }], {} as any);
    expect(r["0-0"]).toBe(0);
    expect(r["0-1"]).toBe(2);
    expect(r["0-2"]).toBe(1);
  });

  it("already sorted input", async () => {
    const r = await argsort([{ "0-0": 1, "0-1": 2, "0-2": 3 }], {} as any);
    expect(r["0-0"]).toBe(0);
    expect(r["0-1"]).toBe(1);
    expect(r["0-2"]).toBe(2);
  });

  it("single element", async () => {
    const r = await argsort([{ "0-0": 42 }], {} as any);
    expect(r["0-0"]).toBe(0);
  });

  it("duplicate values — stable relative order preserved", async () => {
    const r = await argsort([{ "0-0": 2, "0-1": 2, "0-2": 1 }], {} as any);
    // 1 at index 2, then the two 2s in original order
    expect(r["0-0"]).toBe(2);
    expect(r["0-1"]).toBe(0);
    expect(r["0-2"]).toBe(1);
  });
});
