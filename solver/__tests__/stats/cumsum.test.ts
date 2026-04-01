/**
 * Tests for cumsum() — solver/functions/stats/cumsum.ts
 * cumsum(v) — cumulative sum of a vector, preserving key layout.
 */

import { describe, it, expect } from "vitest";
import { cumsum } from "../../functions/stats/cumsum";
import { runPipeline } from "../../pipeline";
import { ctx } from "../helpers";
import type { ResolvedEquation } from "../../types";

const emptyBase: [number,number,number,number,number,number,number,number] = [0,0,0,0,0,0,0,0];

function makeVec(name: string, vals: number[], order: number): ResolvedEquation {
  const real: Record<string, number> = {};
  vals.forEach((v, i) => { real[`0-${i}`] = v; });
  return {
    blockId: name, order, variableName: name,
    solution: { real, imag: {}, size: `1x${vals.length}`, units: "", baseUnits: emptyBase, multiplier: 1 },
    error: null,
  };
}

// ── Direct call tests ──────────────────────────────────────────────────────────

describe("cumsum — direct call: row vectors", () => {
  it("[1, 2, 3, 4] → [1, 3, 6, 10]", async () => {
    const r = await cumsum([{ "0-0": 1, "0-1": 2, "0-2": 3, "0-3": 4 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
    expect(r["0-1"]).toBeCloseTo(3, 10);
    expect(r["0-2"]).toBeCloseTo(6, 10);
    expect(r["0-3"]).toBeCloseTo(10, 10);
  });

  it("[5] → [5] (single element)", async () => {
    const r = await cumsum([{ "0-0": 5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(5, 10);
  });

  it("[-1, -2, -3] → [-1, -3, -6]", async () => {
    const r = await cumsum([{ "0-0": -1, "0-1": -2, "0-2": -3 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-1, 10);
    expect(r["0-1"]).toBeCloseTo(-3, 10);
    expect(r["0-2"]).toBeCloseTo(-6, 10);
  });

  it("[1, -1, 1, -1] → [1, 0, 1, 0]", async () => {
    const r = await cumsum([{ "0-0": 1, "0-1": -1, "0-2": 1, "0-3": -1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
    expect(r["0-1"]).toBeCloseTo(0, 10);
    expect(r["0-2"]).toBeCloseTo(1, 10);
    expect(r["0-3"]).toBeCloseTo(0, 10);
  });

  it("preserves row vector key layout (0-i)", async () => {
    const r = await cumsum([{ "0-0": 2, "0-1": 3 }], ctx("x=0"));
    expect("0-0" in r).toBe(true);
    expect("0-1" in r).toBe(true);
  });
});

describe("cumsum — direct call: column vectors", () => {
  it("column [1;2;3] → [1;3;6]", async () => {
    const r = await cumsum([{ "0-0": 1, "1-0": 2, "2-0": 3 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
    expect(r["1-0"]).toBeCloseTo(3, 10);
    expect(r["2-0"]).toBeCloseTo(6, 10);
  });
});

describe("cumsum — direct call: edge cases", () => {
  it("empty matrix → empty result", async () => {
    const r = await cumsum([{}], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(0);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("cumsum — pipeline", () => {
  it("x = cumsum(v) where v=[1,2,3,4] → [1,3,6,10]", async () => {
    const c = ctx("x = cumsum(v)");
    c.documentEquations = [makeVec("v", [1, 2, 3, 4], -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(3, 4);
    expect(r.solution.real["0-2"]).toBeCloseTo(6, 4);
    expect(r.solution.real["0-3"]).toBeCloseTo(10, 4);
  });

  it("x = cumsum(v) output has same length as input", async () => {
    const c = ctx("x = cumsum(v)");
    c.documentEquations = [makeVec("v", [10, 20, 30], -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(Object.keys(r.solution.real)).toHaveLength(3);
    expect(r.solution.real["0-2"]).toBeCloseTo(60, 4);
  });
});
