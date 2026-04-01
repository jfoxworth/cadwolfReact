import { describe, it, expect } from "vitest";
import { roll } from "../../functions/data/roll";

describe("roll", () => {
  it("roll by 1 shifts elements right", async () => {
    const x = { "0-0": 1, "0-1": 2, "0-2": 3, "0-3": 4 };
    const n = { "0-0": 1 };
    const r = await roll([x, n], {} as any);
    expect(r["0-0"]).toBe(4);
    expect(r["0-1"]).toBe(1);
    expect(r["0-2"]).toBe(2);
    expect(r["0-3"]).toBe(3);
  });

  it("roll by -1 shifts elements left", async () => {
    const x = { "0-0": 1, "0-1": 2, "0-2": 3, "0-3": 4 };
    const n = { "0-0": -1 };
    const r = await roll([x, n], {} as any);
    expect(r["0-0"]).toBe(2);
    expect(r["0-1"]).toBe(3);
    expect(r["0-2"]).toBe(4);
    expect(r["0-3"]).toBe(1);
  });

  it("roll by 0 is identity", async () => {
    const x = { "0-0": 5, "0-1": 6, "0-2": 7 };
    const n = { "0-0": 0 };
    const r = await roll([x, n], {} as any);
    expect(r["0-0"]).toBe(5);
    expect(r["0-1"]).toBe(6);
    expect(r["0-2"]).toBe(7);
  });

  it("roll by length is identity", async () => {
    const x = { "0-0": 1, "0-1": 2, "0-2": 3 };
    const n = { "0-0": 3 };
    const r = await roll([x, n], {} as any);
    expect(r["0-0"]).toBe(1);
    expect(r["0-1"]).toBe(2);
    expect(r["0-2"]).toBe(3);
  });
});
