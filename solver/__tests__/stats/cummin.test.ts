import { describe, it, expect } from "vitest";
import { cummin } from "../../functions/stats/cummin";
import { solveDocument } from "../../worker/document-solver";
import type { OrderedBlock } from "../../types";

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

describe("cummin — unit preservation (inline units)", () => {
  async function solveVecUnit(vecRaw: string, fnRaw: string) {
    const blocks: OrderedBlock[] = [
      { id: "v1", order: 1, type: "EQUATION", definition: { raw: vecRaw, variableName: "x" } },
      { id: "b1", order: 2, type: "EQUATION", definition: { raw: fnRaw, variableName: "y" } },
    ];
    const r1 = await solveDocument(blocks, "v1", []);
    const r2 = await solveDocument(blocks, "b1", r1.resolvedMap);
    return r2.results.find(res => res.blockId === "b1");
  }

  it("cummin([3,5,7] m) → preserves meter dimension", async () => {
    const res = await solveVecUnit("x = [3, 5, 7] m", "y = cummin(x)");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });
  it("cummin([3,5,7] kg*m/s^2) → preserves combined units", async () => {
    const res = await solveVecUnit("x = [3, 5, 7] kg*m/s^2", "y = cummin(x)");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });
  it("cummin([3,5,7] km) → preserves scaled unit", async () => {
    const res = await solveVecUnit("x = [3, 5, 7] km", "y = cummin(x)");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });
  it("cummin([25,50,75] kN) → preserves complex scaled unit", async () => {
    const res = await solveVecUnit("x = [25, 50, 75] kN", "y = cummin(x)");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });
});
