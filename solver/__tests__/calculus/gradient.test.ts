import { describe, it, expect } from "vitest";
import { gradient } from "../../functions/calculus/gradient";
import { ctx } from "../helpers";

describe("gradient — direct call: unit spacing", () => {
  it("constant [3,3,3] → [0,0,0]", async () => {
    const r = await gradient([{ "0-0": 3, "0-1": 3, "0-2": 3 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
    expect(r["0-1"]).toBeCloseTo(0, 10);
    expect(r["0-2"]).toBeCloseTo(0, 10);
  });

  it("linear [0,1,2,3] → [1,1,1,1]", async () => {
    const r = await gradient([{ "0-0": 0, "0-1": 1, "0-2": 2, "0-3": 3 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
    expect(r["0-1"]).toBeCloseTo(1, 10);
    expect(r["0-2"]).toBeCloseTo(1, 10);
    expect(r["0-3"]).toBeCloseTo(1, 10);
  });

  it("quadratic [0,1,4,9] → central diffs [1,2,4,5]", async () => {
    // forward diff at 0: (1-0)/1 = 1
    // central at 1: (4-0)/2 = 2
    // central at 2: (9-1)/2 = 4
    // backward at 3: (9-4)/1 = 5
    const r = await gradient([{ "0-0": 0, "0-1": 1, "0-2": 4, "0-3": 9 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
    expect(r["0-1"]).toBeCloseTo(2, 10);
    expect(r["0-2"]).toBeCloseTo(4, 10);
    expect(r["0-3"]).toBeCloseTo(5, 10);
  });

  it("output same length as input", async () => {
    const v = { "0-0": 1, "0-1": 4, "0-2": 9, "0-3": 16, "0-4": 25 };
    const r = await gradient([v], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(5);
  });

  it("single element → 0", async () => {
    const r = await gradient([{ "0-0": 7 }], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(1);
    expect(Object.values(r)[0]).toBe(0);
  });
});

describe("gradient — with custom spacing h", () => {
  it("[0,1,2] with h=0.5 → [2,2,2]", async () => {
    const r = await gradient([{ "0-0": 0, "0-1": 1, "0-2": 2 }, { "0-0": 0.5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(2, 10);
    expect(r["0-1"]).toBeCloseTo(2, 10);
    expect(r["0-2"]).toBeCloseTo(2, 10);
  });
});
