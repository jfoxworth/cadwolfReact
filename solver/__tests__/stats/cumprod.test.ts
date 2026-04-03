import { describe, it, expect } from "vitest";
import { cumprod } from "../../functions/stats/cumprod";
import { solveDocument } from "../../worker/document-solver";
import type { OrderedBlock } from "../../types";

describe("cumprod", () => {
  it("cumulative product of [1,2,3,4]", async () => {
    const r = await cumprod([{ "0-0": 1, "0-1": 2, "0-2": 3, "0-3": 4 }], {} as any);
    expect(r["0-0"]).toBeCloseTo(1, 10);
    expect(r["0-1"]).toBeCloseTo(2, 10);
    expect(r["0-2"]).toBeCloseTo(6, 10);
    expect(r["0-3"]).toBeCloseTo(24, 10);
  });

  it("preserves shape for column vector", async () => {
    const r = await cumprod([{ "0-0": 2, "1-0": 3, "2-0": 5 }], {} as any);
    expect(r["0-0"]).toBeCloseTo(2, 10);
    expect(r["1-0"]).toBeCloseTo(6, 10);
    expect(r["2-0"]).toBeCloseTo(30, 10);
  });

  it("single element unchanged", async () => {
    const r = await cumprod([{ "0-0": 7 }], {} as any);
    expect(r["0-0"]).toBeCloseTo(7, 10);
  });

  it("empty matrix returns empty", async () => {
    const r = await cumprod([{}], {} as any);
    expect(Object.keys(r).length).toBe(0);
  });

  it("element after zero stays zero", async () => {
    const r = await cumprod([{ "0-0": 3, "0-1": 0, "0-2": 5 }], {} as any);
    expect(r["0-1"]).toBe(0);
    expect(r["0-2"]).toBe(0);
  });
});

describe("cumprod — unit preservation (inline units)", () => {
  async function solveVecUnit(vecRaw: string, fnRaw: string) {
    const blocks: OrderedBlock[] = [
      { id: "v1", order: 1, type: "EQUATION", definition: { raw: vecRaw, variableName: "x" } },
      { id: "b1", order: 2, type: "EQUATION", definition: { raw: fnRaw, variableName: "y" } },
    ];
    const r1 = await solveDocument(blocks, "v1", []);
    const r2 = await solveDocument(blocks, "b1", r1.resolvedMap);
    return r2.results.find(res => res.blockId === "b1");
  }

  it("cumprod([3,5,7] m) → preserves meter dimension", async () => {
    const res = await solveVecUnit("x = [3, 5, 7] m", "y = cumprod(x)");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });
  it("cumprod([3,5,7] kg*m/s^2) → preserves combined units", async () => {
    const res = await solveVecUnit("x = [3, 5, 7] kg*m/s^2", "y = cumprod(x)");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });
  it("cumprod([3,5,7] km) → preserves scaled unit", async () => {
    const res = await solveVecUnit("x = [3, 5, 7] km", "y = cumprod(x)");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });
  it("cumprod([25,50,75] kN) → preserves complex scaled unit", async () => {
    const res = await solveVecUnit("x = [25, 50, 75] kN", "y = cumprod(x)");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });
});
