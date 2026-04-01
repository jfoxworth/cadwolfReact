/**
 * Tests for percentile() — solver/functions/stats/percentile.ts
 * percentile(v, p) — pth percentile of vector v, p in [0, 100]
 * Uses linear interpolation between adjacent sorted ranks.
 */

import { describe, it, expect } from "vitest";
import { percentile } from "../../functions/stats/percentile";
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

describe("percentile — direct call: sorted vector [1,2,3,4,5]", () => {
  const v = { "0-0": 1, "0-1": 2, "0-2": 3, "0-3": 4, "0-4": 5 };

  it("0th percentile → min (1)", async () => {
    const r = await percentile([v, { "0-0": 0 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 8);
  });

  it("100th percentile → max (5)", async () => {
    const r = await percentile([v, { "0-0": 100 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(5, 8);
  });

  it("50th percentile → median (3)", async () => {
    const r = await percentile([v, { "0-0": 50 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(3, 8);
  });

  it("25th percentile → 2", async () => {
    const r = await percentile([v, { "0-0": 25 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(2, 8);
  });

  it("75th percentile → 4", async () => {
    const r = await percentile([v, { "0-0": 75 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(4, 8);
  });
});

describe("percentile — direct call: unsorted input", () => {
  it("unsorted [5,1,3,2,4] 50th → 3 (sorts first)", async () => {
    const v = { "0-0": 5, "0-1": 1, "0-2": 3, "0-3": 2, "0-4": 4 };
    const r = await percentile([v, { "0-0": 50 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(3, 8);
  });
});

describe("percentile — direct call: linear interpolation", () => {
  it("[10, 20] at 50th → 15 (midpoint)", async () => {
    const v = { "0-0": 10, "0-1": 20 };
    const r = await percentile([v, { "0-0": 50 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(15, 8);
  });
});

describe("percentile — direct call: edge cases", () => {
  it("single element → that element regardless of p", async () => {
    const r = await percentile([{ "0-0": 7 }, { "0-0": 50 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(7, 8);
  });

  it("p > 100 → clamped to 100 (max)", async () => {
    const v = { "0-0": 1, "0-1": 2, "0-2": 3 };
    const r = await percentile([v, { "0-0": 150 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(3, 8);
  });

  it("p < 0 → clamped to 0 (min)", async () => {
    const v = { "0-0": 1, "0-1": 2, "0-2": 3 };
    const r = await percentile([v, { "0-0": -10 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 8);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("percentile — pipeline", () => {
  it("x = percentile(v, 50) where v=[1,2,3,4,5] → 3", async () => {
    const c = ctx("x = percentile(v, 50)");
    c.documentEquations = [makeVec("v", [1, 2, 3, 4, 5], -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(3, 4);
  });

  it("x = percentile(v, 0) where v=[1,2,3] → 1", async () => {
    const c = ctx("x = percentile(v, 0)");
    c.documentEquations = [makeVec("v", [1, 2, 3], -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
  });

  it("x = percentile(v, 100) where v=[1,2,3] → 3", async () => {
    const c = ctx("x = percentile(v, 100)");
    c.documentEquations = [makeVec("v", [1, 2, 3], -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(3, 4);
  });
});
