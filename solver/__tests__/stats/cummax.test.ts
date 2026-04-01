import { describe, it, expect } from "vitest";
import { cummax } from "../../functions/stats/cummax";

describe("cummax", () => {
  it("running max of [3,1,4,1,5,9]", async () => {
    const r = await cummax([{ "0-0": 3, "0-1": 1, "0-2": 4, "0-3": 1, "0-4": 5, "0-5": 9 }], {} as any);
    expect(r["0-0"]).toBe(3);
    expect(r["0-1"]).toBe(3);
    expect(r["0-2"]).toBe(4);
    expect(r["0-3"]).toBe(4);
    expect(r["0-4"]).toBe(5);
    expect(r["0-5"]).toBe(9);
  });

  it("already sorted ascending — every element is the max", async () => {
    const r = await cummax([{ "0-0": 1, "0-1": 2, "0-2": 3 }], {} as any);
    expect(r["0-0"]).toBe(1);
    expect(r["0-1"]).toBe(2);
    expect(r["0-2"]).toBe(3);
  });

  it("sorted descending — first element dominates", async () => {
    const r = await cummax([{ "0-0": 9, "0-1": 5, "0-2": 1 }], {} as any);
    expect(r["0-0"]).toBe(9);
    expect(r["0-1"]).toBe(9);
    expect(r["0-2"]).toBe(9);
  });

  it("preserves column vector shape", async () => {
    const r = await cummax([{ "0-0": 1, "1-0": 3, "2-0": 2 }], {} as any);
    expect(r["0-0"]).toBe(1);
    expect(r["1-0"]).toBe(3);
    expect(r["2-0"]).toBe(3);
  });

  it("single element", async () => {
    const r = await cummax([{ "0-0": 5 }], {} as any);
    expect(r["0-0"]).toBe(5);
  });

  it("empty returns empty", async () => {
    const r = await cummax([{}], {} as any);
    expect(Object.keys(r).length).toBe(0);
  });
});
