import { describe, it, expect } from "vitest";
import { conv } from "../../functions/signal/conv";
import { ctx } from "../helpers";

describe("conv — direct call", () => {
  it("[1] * [1] → [1] (identity)", async () => {
    const r = await conv([{ "0-0": 1 }, { "0-0": 1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
    expect(Object.keys(r)).toHaveLength(1);
  });

  it("[1, 2, 3] * [1] → [1, 2, 3]", async () => {
    const x = { "0-0": 1, "0-1": 2, "0-2": 3 };
    const h = { "0-0": 1 };
    const r = await conv([x, h], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
    expect(r["0-1"]).toBeCloseTo(2, 10);
    expect(r["0-2"]).toBeCloseTo(3, 10);
  });

  it("[1, 2] * [1, 2] → [1, 4, 4]", async () => {
    const r = await conv([{ "0-0": 1, "0-1": 2 }, { "0-0": 1, "0-1": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
    expect(r["0-1"]).toBeCloseTo(4, 10);
    expect(r["0-2"]).toBeCloseTo(4, 10);
  });

  it("[1, 2, 3] * [4, 5] → [4, 13, 22, 15]", async () => {
    const x = { "0-0": 1, "0-1": 2, "0-2": 3 };
    const h = { "0-0": 4, "0-1": 5 };
    const r = await conv([x, h], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(4, 10);
    expect(r["0-1"]).toBeCloseTo(13, 10);
    expect(r["0-2"]).toBeCloseTo(22, 10);
    expect(r["0-3"]).toBeCloseTo(15, 10);
  });

  it("output length = len(x) + len(h) - 1", async () => {
    const x = { "0-0": 1, "0-1": 2, "0-2": 3, "0-3": 4 }; // len 4
    const h = { "0-0": 1, "0-1": 2, "0-2": 3 };             // len 3
    const r = await conv([x, h], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(6); // 4 + 3 - 1
  });

  it("convolution with unit impulse recovers signal", async () => {
    const x = { "0-0": 1, "0-1": 3, "0-2": 5 };
    const impulse = { "0-0": 1 };
    const r = await conv([x, impulse], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
    expect(r["0-1"]).toBeCloseTo(3, 10);
    expect(r["0-2"]).toBeCloseTo(5, 10);
  });
});
