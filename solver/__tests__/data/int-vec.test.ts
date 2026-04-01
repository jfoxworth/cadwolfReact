/**
 * Tests for intVec() — solver/functions/data/int-vec.ts
 *
 * Formula: cumulative trapezoidal integration (like MATLAB cumtrapz)
 *   intVec(xdata, ydata)
 *   output[i] = ∫ y dx from x[0] to x[i+1]  (n-1 output elements)
 *   Returns { "0-0": 0 } when input has fewer than 3 points.
 *
 * Direct-call tests:
 *   - n < 3 → { "0-0": 0 }
 *   - constant y=1, uniform x spacing → output = [1, 2, 3, ...]
 *   - linear y=2x, x=[0,1,2,3] → cumtrapz = [1, 4, 9]
 *   - y=[0,2,4,6], x=[0,1,2,3] → cumtrapz = [1, 4, 9]
 *   - non-uniform x spacing → correct trapezoid areas
 *
 * Pipeline tests:
 *   - intVec([0,1,2,3], [1,1,1,1]) → [1, 2, 3]
 *   - intVec([0,1,2,3], [0,2,4,6]) → [1, 4, 9]
 *
 * Unit tests:
 *   - intVec operates on SI-converted numeric values
 *   - xdata in m, ydata dimensionless → integral values in SI units
 */

import { describe, it, expect } from "vitest";
import { intVec } from "../../functions/data/int-vec";
import { runPipeline } from "../../pipeline";
import { ctx } from "../helpers";
import { solveDocument } from "../../worker/document-solver";
import type { ResolvedEquation, OrderedBlock } from "../../types";

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

describe("intVec — direct call: degenerate cases (n < 3)", () => {
  it("n=1 → { '0-0': 0 }", async () => {
    const r = await intVec([{ "0-0": 0 }, { "0-0": 1 }], ctx("x=0"));
    expect(r["0-0"]).toBe(0);
    expect(Object.keys(r)).toHaveLength(1);
  });

  it("n=2 → { '0-0': 0 }", async () => {
    const r = await intVec([{ "0-0": 0, "0-1": 1 }, { "0-0": 1, "0-1": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBe(0);
    expect(Object.keys(r)).toHaveLength(1);
  });
});

describe("intVec — direct call: constant y", () => {
  it("y=1 over x=[0,1,2,3] → [1, 2, 3]", async () => {
    const x = { "0-0": 0, "0-1": 1, "0-2": 2, "0-3": 3 };
    const y = { "0-0": 1, "0-1": 1, "0-2": 1, "0-3": 1 };
    const r = await intVec([x, y], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
    expect(r["0-1"]).toBeCloseTo(2, 10);
    expect(r["0-2"]).toBeCloseTo(3, 10);
    expect(Object.keys(r)).toHaveLength(3);
  });

  it("y=2 over x=[0,1,2] → [2, 4]", async () => {
    const x = { "0-0": 0, "0-1": 1, "0-2": 2 };
    const y = { "0-0": 2, "0-1": 2, "0-2": 2 };
    const r = await intVec([x, y], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(2, 10);
    expect(r["0-1"]).toBeCloseTo(4, 10);
  });
});

describe("intVec — direct call: linear y", () => {
  it("y=2x over x=[0,1,2,3] → [1, 4, 9]", async () => {
    // trap(0→1): (0+2)/2 * 1 = 1
    // trap(1→2): (2+4)/2 * 1 = 3 → cum = 4
    // trap(2→3): (4+6)/2 * 1 = 5 → cum = 9
    const x = { "0-0": 0, "0-1": 1, "0-2": 2, "0-3": 3 };
    const y = { "0-0": 0, "0-1": 2, "0-2": 4, "0-3": 6 };
    const r = await intVec([x, y], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
    expect(r["0-1"]).toBeCloseTo(4, 10);
    expect(r["0-2"]).toBeCloseTo(9, 10);
  });
});

describe("intVec — direct call: non-uniform spacing", () => {
  it("x=[0,1,3], y=[0,1,1] → [0.5, 2.5]", async () => {
    // trap(0→1): (0+1)/2 * 1 = 0.5
    // trap(1→3): (1+1)/2 * 2 = 2 → cum = 2.5
    const x = { "0-0": 0, "0-1": 1, "0-2": 3 };
    const y = { "0-0": 0, "0-1": 1, "0-2": 1 };
    const r = await intVec([x, y], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0.5, 10);
    expect(r["0-1"]).toBeCloseTo(2.5, 10);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("intVec — pipeline: constant y", () => {
  it("intVec([0,1,2,3], [1,1,1,1]) → first element is 1", async () => {
    const r = await runPipeline(ctx("x = intVec([0,1,2,3], [1,1,1,1])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(2, 4);
    expect(r.solution.real["0-2"]).toBeCloseTo(3, 4);
  });
});

describe("intVec — pipeline: linear y", () => {
  it("intVec([0,1,2,3], [0,2,4,6]) → [1, 4, 9]", async () => {
    const r = await runPipeline(ctx("x = intVec([0,1,2,3], [0,2,4,6])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(4, 4);
    expect(r.solution.real["0-2"]).toBeCloseTo(9, 4);
  });
});

describe("intVec — pipeline: vectors via documentEquations", () => {
  it("intVec(xv, yv) where xv=[0,1,2], yv=[1,1,1] → [1, 2]", async () => {
    const c = ctx("z = intVec(xv, yv)");
    c.documentEquations = [
      makeVec("xv", [0, 1, 2], -2),
      makeVec("yv", [1, 1, 1], -1),
    ];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(2, 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────

async function solveWith(xVal: string, xUnit: string, yVal: string, yUnit: string, fnExpr: string) {
  const blocks: OrderedBlock[] = [
    { id: "xvb", order: 1, type: "EQUATION", definition: { raw: `xv = ${xVal}`, variableName: "xv", unit: xUnit } },
    { id: "yvb", order: 2, type: "EQUATION", definition: { raw: `yv = ${yVal}`, variableName: "yv", unit: yUnit } },
    { id: "zb",  order: 3, type: "EQUATION", definition: { raw: `z = ${fnExpr}`, variableName: "z", unit: "" } },
  ];
  const r1 = await solveDocument(blocks, "xvb", []);
  const r2 = await solveDocument(blocks, "yvb", r1.resolvedMap);
  const r3 = await solveDocument(blocks, "zb", r2.resolvedMap);
  return r3.results.find((r) => r.blockId === "zb")!;
}

describe("intVec — unit tests: SI values used in integration", () => {
  it("x in m, y dimensionless → result uses SI x values", async () => {
    // xv = 1m → SI = 1, yv = 1 → intVec([0,1,2,3], [1,1,1,1]) for 4pt x
    // Use single-point so it returns 0 (n<3)
    const r = await runPipeline(ctx("z = intVec([0ft,1ft,2ft], [1,1,1])"));
    expect(r.errors).toHaveLength(0);
    // x in ft → SI in m (0.3048, 0.6096): area ≠ 2 (like uniform 1m spacing)
    const FT_M = 0.3048;
    expect(r.solution.real["0-0"]).toBeCloseTo(FT_M, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(2 * FT_M, 4);
  });
});
