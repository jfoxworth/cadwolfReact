import { describe, it, expect } from "vitest";
import { cummax } from "../../functions/stats/cummax";
import { solveDocument } from "../../worker/document-solver";
import type { OrderedBlock } from "../../types";

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

describe("cummax — unit preservation (inline units)", () => {
  async function solveVecUnit(vecRaw: string, fnRaw: string) {
    const blocks: OrderedBlock[] = [
      { id: "v1", order: 1, type: "EQUATION", definition: { raw: vecRaw, variableName: "x" } },
      { id: "b1", order: 2, type: "EQUATION", definition: { raw: fnRaw, variableName: "y" } },
    ];
    const r1 = await solveDocument(blocks, "v1", []);
    const r2 = await solveDocument(blocks, "b1", r1.resolvedMap);
    return r2.results.find(res => res.blockId === "b1");
  }

  it("cummax([3,5,7] m) → preserves meter dimension", async () => {
    const res = await solveVecUnit("x = [3, 5, 7] m", "y = cummax(x)");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });
  it("cummax([3,5,7] kg*m/s^2) → preserves combined units", async () => {
    const res = await solveVecUnit("x = [3, 5, 7] kg*m/s^2", "y = cummax(x)");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });
  it("cummax([3,5,7] km) → preserves scaled unit", async () => {
    const res = await solveVecUnit("x = [3, 5, 7] km", "y = cummax(x)");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });
  it("cummax([25,50,75] kN) → preserves complex scaled unit", async () => {
    const res = await solveVecUnit("x = [25, 50, 75] kN", "y = cummax(x)");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });
});
