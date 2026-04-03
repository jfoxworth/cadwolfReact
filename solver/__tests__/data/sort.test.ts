import { describe, it, expect } from "vitest";
import { sort } from "../../functions/data/sort";
import { runPipeline } from "../../pipeline";
import { ctx } from "../helpers";
import type { ResolvedEquation, OrderedBlock } from "../../types";
import { solveDocument } from "../../worker/document-solver";

const emptyBase: [number,number,number,number,number,number,number,number] = [0,0,0,0,0,0,0,0];
function makeVec(name: string, vals: number[], order: number): ResolvedEquation {
  const real: Record<string, number> = {};
  vals.forEach((v, i) => { real[`0-${i}`] = v; });
  return { blockId: name, order, variableName: name,
    solution: { real, imag: {}, size: `1x${vals.length}`, units: "", baseUnits: emptyBase, multiplier: 1 }, error: null };
}

describe("sort — direct call: ascending (default)", () => {
  it("[3,1,4,1,5] → [1,1,3,4,5]", async () => {
    const v = { "0-0": 3, "0-1": 1, "0-2": 4, "0-3": 1, "0-4": 5 };
    const r = await sort([v], ctx("x=0"));
    expect(r["0-0"]).toBe(1);
    expect(r["0-1"]).toBe(1);
    expect(r["0-2"]).toBe(3);
    expect(r["0-3"]).toBe(4);
    expect(r["0-4"]).toBe(5);
  });

  it("already sorted → unchanged", async () => {
    const v = { "0-0": 1, "0-1": 2, "0-2": 3 };
    const r = await sort([v], ctx("x=0"));
    expect(r["0-0"]).toBe(1);
    expect(r["0-1"]).toBe(2);
    expect(r["0-2"]).toBe(3);
  });

  it("negative values sort correctly", async () => {
    const v = { "0-0": -3, "0-1": 5, "0-2": -1, "0-3": 2 };
    const r = await sort([v], ctx("x=0"));
    expect(r["0-0"]).toBe(-3);
    expect(r["0-1"]).toBe(-1);
    expect(r["0-2"]).toBe(2);
    expect(r["0-3"]).toBe(5);
  });
});

describe("sort — direct call: descending", () => {
  it("[3,1,4,1,5] descending → [5,4,3,1,1]", async () => {
    const v = { "0-0": 3, "0-1": 1, "0-2": 4, "0-3": 1, "0-4": 5 };
    const r = await sort([v, { "0-0": -1 }], ctx("x=0"));
    expect(r["0-0"]).toBe(5);
    expect(r["0-1"]).toBe(4);
    expect(r["0-2"]).toBe(3);
    expect(r["0-3"]).toBe(1);
    expect(r["0-4"]).toBe(1);
  });
});

describe("sort — pipeline", () => {
  it("x = sort(v) where v=[5,2,8,1] → [1,2,5,8]", async () => {
    const c = ctx("x = sort(v)");
    c.documentEquations = [makeVec("v", [5, 2, 8, 1], -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBe(1);
    expect(r.solution.real["0-3"]).toBe(8);
  });
});

describe("sort — unit preservation (inline units)", () => {
  async function solveVecUnit(vecRaw: string, fnRaw: string) {
    const blocks: OrderedBlock[] = [
      { id: "v1", order: 1, type: "EQUATION", definition: { raw: vecRaw, variableName: "x" } },
      { id: "b1", order: 2, type: "EQUATION", definition: { raw: fnRaw, variableName: "y" } },
    ];
    const r1 = await solveDocument(blocks, "v1", []);
    const r2 = await solveDocument(blocks, "b1", r1.resolvedMap);
    return r2.results.find(res => res.blockId === "b1");
  }

  it("sort([3,5,7] m) → preserves meter dimension", async () => {
    const res = await solveVecUnit("x = [3, 5, 7] m", "y = sort(x)");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });
  it("sort([3,5,7] kg*m/s^2) → preserves combined units", async () => {
    const res = await solveVecUnit("x = [3, 5, 7] kg*m/s^2", "y = sort(x)");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });
  it("sort([3,5,7] km) → preserves scaled unit", async () => {
    const res = await solveVecUnit("x = [3, 5, 7] km", "y = sort(x)");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });
  it("sort([25,50,75] kN) → preserves complex scaled unit", async () => {
    const res = await solveVecUnit("x = [25, 50, 75] kN", "y = sort(x)");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });
});
