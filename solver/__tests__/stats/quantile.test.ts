/**
 * Tests for quantile() — solver/functions/stats/quantile.ts
 * quantile(v, p) — pth quantile of vector v, p in [0, 1]
 * Uses linear interpolation between adjacent sorted ranks.
 * Same as percentile but p is 0–1 instead of 0–100.
 */

import { describe, it, expect } from "vitest";
import { quantile } from "../../functions/stats/quantile";
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

describe("quantile — direct call: sorted vector [1,2,3,4,5]", () => {
  const v = { "0-0": 1, "0-1": 2, "0-2": 3, "0-3": 4, "0-4": 5 };

  it("p=0 → min (1)", async () => {
    const r = await quantile([v, { "0-0": 0 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 8);
  });

  it("p=1 → max (5)", async () => {
    const r = await quantile([v, { "0-0": 1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(5, 8);
  });

  it("p=0.5 → median (3)", async () => {
    const r = await quantile([v, { "0-0": 0.5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(3, 8);
  });

  it("p=0.25 → Q1 (2)", async () => {
    const r = await quantile([v, { "0-0": 0.25 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(2, 8);
  });

  it("p=0.75 → Q3 (4)", async () => {
    const r = await quantile([v, { "0-0": 0.75 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(4, 8);
  });
});

describe("quantile — direct call: linear interpolation", () => {
  it("[10, 20] at p=0.5 → 15", async () => {
    const v = { "0-0": 10, "0-1": 20 };
    const r = await quantile([v, { "0-0": 0.5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(15, 8);
  });

  it("[0, 100] at p=0.3 → 30", async () => {
    const v = { "0-0": 0, "0-1": 100 };
    const r = await quantile([v, { "0-0": 0.3 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(30, 8);
  });
});

describe("quantile — direct call: edge cases", () => {
  it("single element → that element", async () => {
    const r = await quantile([{ "0-0": 42 }, { "0-0": 0.5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(42, 8);
  });

  it("p > 1 → clamped to 1 (max)", async () => {
    const v = { "0-0": 1, "0-1": 2, "0-2": 3 };
    const r = await quantile([v, { "0-0": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(3, 8);
  });

  it("p < 0 → clamped to 0 (min)", async () => {
    const v = { "0-0": 1, "0-1": 2, "0-2": 3 };
    const r = await quantile([v, { "0-0": -0.5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 8);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("quantile — pipeline", () => {
  it("x = quantile(v, 0.5) where v=[2,4,6] → 4", async () => {
    const c = ctx("x = quantile(v, 0.5)");
    c.documentEquations = [makeVec("v", [2, 4, 6], -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(4, 4);
  });

  it("x = quantile(v, 0) where v=[10,20,30] → 10", async () => {
    const c = ctx("x = quantile(v, 0)");
    c.documentEquations = [makeVec("v", [10, 20, 30], -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(10, 4);
  });

  it("x = quantile(v, 1) where v=[10,20,30] → 30", async () => {
    const c = ctx("x = quantile(v, 1)");
    c.documentEquations = [makeVec("v", [10, 20, 30], -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(30, 4);
  });
});
