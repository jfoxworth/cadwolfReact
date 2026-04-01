/**
 * Tests for diff() — solver/functions/stats/diff.ts
 * diff(v) — first-order finite differences: result[i] = v[i+1] - v[i]
 * Output length = input length - 1.
 */

import { describe, it, expect } from "vitest";
import { diff } from "../../functions/stats/diff";
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

describe("diff — direct call: row vectors", () => {
  it("[1, 3, 6, 10] → [2, 3, 4]", async () => {
    const r = await diff([{ "0-0": 1, "0-1": 3, "0-2": 6, "0-3": 10 }], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(3);
    expect(r["0-0"]).toBeCloseTo(2, 10);
    expect(r["0-1"]).toBeCloseTo(3, 10);
    expect(r["0-2"]).toBeCloseTo(4, 10);
  });

  it("[1, 2, 3, 4, 5] → [1, 1, 1, 1] (uniform differences)", async () => {
    const r = await diff([{ "0-0": 1, "0-1": 2, "0-2": 3, "0-3": 4, "0-4": 5 }], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(4);
    for (let i = 0; i < 4; i++) {
      expect(r[`0-${i}`]).toBeCloseTo(1, 10);
    }
  });

  it("[5, 3, 1] → [-2, -2] (decreasing)", async () => {
    const r = await diff([{ "0-0": 5, "0-1": 3, "0-2": 1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-2, 10);
    expect(r["0-1"]).toBeCloseTo(-2, 10);
  });

  it("[0, 0, 0] → [0, 0]", async () => {
    const r = await diff([{ "0-0": 0, "0-1": 0, "0-2": 0 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
    expect(r["0-1"]).toBeCloseTo(0, 10);
  });
});

describe("diff — direct call: output length = input length - 1", () => {
  it("5-element input → 4-element output", async () => {
    const v: Record<string, number> = {};
    for (let i = 0; i < 5; i++) v[`0-${i}`] = i * i;
    const r = await diff([v], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(4);
  });
});

describe("diff — direct call: edge cases", () => {
  it("single element → empty result", async () => {
    const r = await diff([{ "0-0": 7 }], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(0);
  });

  it("empty matrix → empty result", async () => {
    const r = await diff([{}], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(0);
  });

  it("two elements → single diff", async () => {
    const r = await diff([{ "0-0": 3, "0-1": 8 }], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(1);
    expect(r["0-0"]).toBeCloseTo(5, 10);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("diff — pipeline", () => {
  it("x = diff(v) where v=[1,4,9,16] → [3,5,7]", async () => {
    const c = ctx("x = diff(v)");
    c.documentEquations = [makeVec("v", [1, 4, 9, 16], -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(Object.keys(r.solution.real)).toHaveLength(3);
    expect(r.solution.real["0-0"]).toBeCloseTo(3, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(5, 4);
    expect(r.solution.real["0-2"]).toBeCloseTo(7, 4);
  });
});
