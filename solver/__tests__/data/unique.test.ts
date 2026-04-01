import { describe, it, expect } from "vitest";
import { unique } from "../../functions/data/unique";
import { ctx } from "../helpers";

describe("unique — direct call", () => {
  it("[3,1,4,1,5,9,2,6,5] → [1,2,3,4,5,6,9] (sorted unique)", async () => {
    const v = { "0-0": 3, "0-1": 1, "0-2": 4, "0-3": 1, "0-4": 5, "0-5": 9, "0-6": 2, "0-7": 6, "0-8": 5 };
    const r = await unique([v], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(7);
    expect(r["0-0"]).toBe(1);
    expect(r["0-1"]).toBe(2);
    expect(r["0-2"]).toBe(3);
    expect(r["0-6"]).toBe(9);
  });

  it("no duplicates → same elements sorted", async () => {
    const v = { "0-0": 5, "0-1": 3, "0-2": 1 };
    const r = await unique([v], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(3);
    expect(r["0-0"]).toBe(1);
    expect(r["0-2"]).toBe(5);
  });

  it("all same → single element", async () => {
    const v = { "0-0": 7, "0-1": 7, "0-2": 7 };
    const r = await unique([v], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(1);
    expect(r["0-0"]).toBe(7);
  });

  it("single element → single element", async () => {
    const r = await unique([{ "0-0": 42 }], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(1);
    expect(r["0-0"]).toBe(42);
  });

  it("preserves row vector layout", async () => {
    const r = await unique([{ "0-0": 2, "0-1": 1 }], ctx("x=0"));
    for (const k of Object.keys(r)) expect(k.startsWith("0-")).toBe(true);
  });
});
