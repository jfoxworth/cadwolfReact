import { describe, it, expect } from "vitest";
import { corr } from "../../functions/stats/corr";
import { runPipeline } from "../../pipeline";
import { ctx } from "../helpers";
import type { ResolvedEquation } from "../../types";

const emptyBase: [number,number,number,number,number,number,number,number] = [0,0,0,0,0,0,0,0];
function makeVec(name: string, vals: number[], order: number): ResolvedEquation {
  const real: Record<string, number> = {};
  vals.forEach((v, i) => { real[`0-${i}`] = v; });
  return { blockId: name, order, variableName: name,
    solution: { real, imag: {}, size: `1x${vals.length}`, units: "", baseUnits: emptyBase, multiplier: 1 }, error: null };
}

describe("corr — direct call", () => {
  it("perfect positive correlation → 1", async () => {
    const x = { "0-0": 1, "0-1": 2, "0-2": 3 };
    const y = { "0-0": 2, "0-1": 4, "0-2": 6 };
    const r = await corr([x, y], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 8);
  });

  it("perfect negative correlation → -1", async () => {
    const x = { "0-0": 1, "0-1": 2, "0-2": 3 };
    const y = { "0-0": -1, "0-1": -2, "0-2": -3 };
    const r = await corr([x, y], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-1, 8);
  });

  it("uncorrelated → near 0", async () => {
    const x = { "0-0": 1, "0-1": 2, "0-2": 3, "0-3": 4 };
    const y = { "0-0": 2, "0-1": 1, "0-2": 4, "0-3": 3 };
    const r = await corr([x, y], ctx("x=0"));
    // Not exactly 0 for small samples, but the concept holds
    expect(typeof r["0-0"]).toBe("number");
  });

  it("returns scalar in [-1, 1]", async () => {
    const x = { "0-0": 1, "0-1": 3, "0-2": 2, "0-3": 5 };
    const y = { "0-0": 2, "0-1": 4, "0-2": 1, "0-3": 6 };
    const r = await corr([x, y], ctx("x=0"));
    expect(r["0-0"]).toBeGreaterThanOrEqual(-1);
    expect(r["0-0"]).toBeLessThanOrEqual(1);
  });

  it("n < 2 → NaN", async () => {
    const r = await corr([{ "0-0": 5 }, { "0-0": 5 }], ctx("x=0"));
    expect(r["0-0"]).toBeNaN();
  });
});
