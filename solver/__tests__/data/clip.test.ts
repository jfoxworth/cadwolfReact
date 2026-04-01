import { describe, it, expect } from "vitest";
import { clip } from "../../functions/data/clip";

describe("clip", () => {
  it("clamps values to [2, 6]", async () => {
    const r = await clip(
      [{ "0-0": 1, "0-1": 5, "0-2": 3, "0-3": 7, "0-4": 2 }, { "0-0": 2 }, { "0-0": 6 }],
      {} as any
    );
    expect(r["0-0"]).toBe(2); // 1 → 2
    expect(r["0-1"]).toBe(5); // 5 unchanged
    expect(r["0-2"]).toBe(3); // 3 unchanged
    expect(r["0-3"]).toBe(6); // 7 → 6
    expect(r["0-4"]).toBe(2); // 2 unchanged
  });

  it("only lower bound", async () => {
    const r = await clip([{ "0-0": -5, "0-1": 0, "0-2": 10 }, { "0-0": 0 }], {} as any);
    expect(r["0-0"]).toBe(0);
    expect(r["0-1"]).toBe(0);
    expect(r["0-2"]).toBe(10);
  });

  it("only upper bound", async () => {
    const r = await clip([{ "0-0": 1, "0-1": 5, "0-2": 10 }, undefined, { "0-0": 4 }] as any, {} as any);
    expect(r["0-0"]).toBe(1);
    expect(r["0-1"]).toBe(4);
    expect(r["0-2"]).toBe(4);
  });

  it("no bounds — passthrough", async () => {
    const r = await clip([{ "0-0": 1, "0-1": 5, "0-2": 10 }], {} as any);
    expect(r["0-0"]).toBe(1);
    expect(r["0-1"]).toBe(5);
    expect(r["0-2"]).toBe(10);
  });

  it("scalar clamp", async () => {
    const r = await clip([{ "0-0": 100 }, { "0-0": -50 }, { "0-0": 50 }], {} as any);
    expect(r["0-0"]).toBe(50);
  });
});
