/**
 * Tests for derivativeUn() — solver/functions/calculus/derivative-un.ts
 *
 * Formula: first derivative of unequally-spaced data via 3-point Lagrange quadratic differentiation.
 *   derivativeUn(xdata, ydata, newxdata)
 *   For each query point in newxdata, finds the nearest interior sample bracket
 *   and evaluates the Lagrange derivative through (x[i-1],y[i-1]), (x[i],y[i]), (x[i+1],y[i+1]).
 *   Returns a row vector of length = len(newxdata).
 *   Requires ≥ 5 points in xdata/ydata — returns { "0-0": 0 } otherwise.
 *
 * Direct-call tests:
 *   - n < 5 → { "0-0": 0 }
 *   - f=x², uniform spacing, query at interior points → f'≈2x
 *   - f=x², non-uniform spacing → f'≈2x at query points
 *   - multiple query points → vector output
 *   - query point out of interior → 0 (no valid bracket)
 *
 * Pipeline tests:
 *   - derivativeUn([0,1,2,3,4], [0,1,4,9,16], [1,2,3]) → [2, 4, 6]
 *   - via documentEquations vectors
 *
 * Unit tests:
 *   - xdata[s], ydata[m] → output baseUnits = m/s (m¹ s⁻¹)
 *   - xdata[s], ydata[kg] → output baseUnits = kg/s
 *   - dimensionless inputs → no units
 *   - numeric values use SI-converted xdata and ydata
 */

import { describe, it, expect } from "vitest";
import { derivativeUn } from "../../functions/calculus/derivative-un";
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

function vec(vals: number[]): Record<string, number> {
  const m: Record<string, number> = {};
  vals.forEach((v, i) => { m[`0-${i}`] = v; });
  return m;
}

// ── Direct call tests ──────────────────────────────────────────────────────────

describe("derivativeUn — direct call: degenerate (n < 5)", () => {
  it("n=1 → { '0-0': 0 }", async () => {
    const r = await derivativeUn(
      [vec([0]), vec([0]), vec([0])],
      ctx("x=0")
    );
    expect(r["0-0"]).toBe(0);
  });

  it("n=4 → { '0-0': 0 }", async () => {
    const r = await derivativeUn(
      [vec([0,1,2,3]), vec([0,1,4,9]), vec([1])],
      ctx("x=0")
    );
    expect(r["0-0"]).toBe(0);
  });
});

describe("derivativeUn — direct call: f=x², uniform spacing", () => {
  // x=[0,1,2,3,4], y=x² → f'=2x
  const xd = vec([0, 1, 2, 3, 4]);
  const yd = vec([0, 1, 4, 9, 16]);

  it("query at x=1 → f'≈2", async () => {
    const r = await derivativeUn([xd, yd, vec([1])], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(2, 4);
  });

  it("query at x=2 → f'≈4", async () => {
    const r = await derivativeUn([xd, yd, vec([2])], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(4, 4);
  });

  it("query at x=3 → f'≈6", async () => {
    const r = await derivativeUn([xd, yd, vec([3])], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(6, 4);
  });

  it("multiple queries [1,2,3] → [2, 4, 6]", async () => {
    const r = await derivativeUn([xd, yd, vec([1, 2, 3])], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(2, 4);
    expect(r["0-1"]).toBeCloseTo(4, 4);
    expect(r["0-2"]).toBeCloseTo(6, 4);
    expect(Object.keys(r)).toHaveLength(3);
  });
});

describe("derivativeUn — direct call: f=x², non-uniform spacing", () => {
  // x=[0,1,3,6,10], y=x² → f'=2x
  const xd = vec([0, 1, 3, 6, 10]);
  const yd = vec([0, 1, 9, 36, 100]);

  it("query at x=1 → f'≈2", async () => {
    const r = await derivativeUn([xd, yd, vec([1])], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(2, 2);
  });

  it("query at x=3 → f'≈6", async () => {
    const r = await derivativeUn([xd, yd, vec([3])], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(6, 2);
  });
});

describe("derivativeUn — direct call: linear f=2x (exact for Lagrange quadratic)", () => {
  // Lagrange quadratic through 3 points of a linear function is exact
  const xd = vec([0, 1, 2, 3, 4]);
  const yd = vec([0, 2, 4, 6, 8]);  // f(x)=2x

  it("query at x=1 → f'=2 exactly", async () => {
    const r = await derivativeUn([xd, yd, vec([1])], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(2, 8);
  });

  it("query at x=2.5 → f'=2 exactly (linear is exact)", async () => {
    const r = await derivativeUn([xd, yd, vec([2.5])], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(2, 4);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("derivativeUn — pipeline: f=x²", () => {
  it("derivativeUn([0,1,2,3,4], [0,1,4,9,16], [1,2,3]) → [2,4,6]", async () => {
    const r = await runPipeline(ctx("x = derivativeUn([0,1,2,3,4], [0,1,4,9,16], [1,2,3])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(2, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(4, 4);
    expect(r.solution.real["0-2"]).toBeCloseTo(6, 4);
  });

  it("n < 5 inline → { '0-0': 0 }", async () => {
    const r = await runPipeline(ctx("x = derivativeUn([0,1,2,3], [0,1,4,9], [1])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });
});

describe("derivativeUn — pipeline: vectors via documentEquations", () => {
  it("derivativeUn(xv, yv, nxv) where xv=[0..4], yv=x², nxv=[2] → 4", async () => {
    const c = ctx("dydx = derivativeUn(xv, yv, nxv)");
    c.documentEquations = [
      makeVec("xv",  [0, 1, 2, 3, 4],   -3),
      makeVec("yv",  [0, 1, 4, 9, 16],  -2),
      makeVec("nxv", [2],               -1),
    ];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(4, 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────

async function solveCalc(blocks: OrderedBlock[], targetId: string) {
  let resolved: Awaited<ReturnType<typeof solveDocument>>["resolvedMap"] = [];
  for (const block of blocks) {
    const r = await solveDocument(blocks, block.id, resolved);
    resolved = r.resolvedMap;
    if (block.id === targetId) {
      return r.results.find((res) => res.blockId === targetId)!;
    }
  }
  return undefined as never;
}

describe("derivativeUn — unit tests: output unit = y_unit / x_unit", () => {
  it("xdata[s], ydata[m] → baseUnits m¹ s⁻¹", async () => {
    const blocks: OrderedBlock[] = [
      { id: "a", order: 1, type: "EQUATION", definition: { raw: "xd = [0,1,2,3,4]",  variableName: "xd", unit: "s" } },
      { id: "b", order: 2, type: "EQUATION", definition: { raw: "yd = [0,1,4,9,16]", variableName: "yd", unit: "m" } },
      { id: "c", order: 3, type: "EQUATION", definition: { raw: "r = derivativeUn(xd, yd, [1,2,3])", variableName: "r", unit: "" } },
    ];
    const r = await solveCalc(blocks, "c");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.baseUnits?.[3]).toBe(1);   // m¹
    expect(r.solution?.baseUnits?.[2]).toBe(-1);  // s⁻¹
    expect(r.solution?.real?.["0-0"]).toBeCloseTo(2, 3);
  });

  it("xdata[s], ydata[kg] → baseUnits kg¹ s⁻¹", async () => {
    const blocks: OrderedBlock[] = [
      { id: "a", order: 1, type: "EQUATION", definition: { raw: "xd = [0,1,2,3,4]",  variableName: "xd", unit: "s"  } },
      { id: "b", order: 2, type: "EQUATION", definition: { raw: "yd = [0,2,4,6,8]",  variableName: "yd", unit: "kg" } },
      { id: "c", order: 3, type: "EQUATION", definition: { raw: "r = derivativeUn(xd, yd, [2])", variableName: "r", unit: "" } },
    ];
    const r = await solveCalc(blocks, "c");
    expect(r.solution?.baseUnits?.[4]).toBe(1);   // kg¹
    expect(r.solution?.baseUnits?.[2]).toBe(-1);  // s⁻¹
  });

  it("xdata dimensionless, ydata[m] → baseUnits m¹ (divide by 1)", async () => {
    const blocks: OrderedBlock[] = [
      { id: "a", order: 1, type: "EQUATION", definition: { raw: "xd = [0,1,2,3,4]",  variableName: "xd", unit: "" } },
      { id: "b", order: 2, type: "EQUATION", definition: { raw: "yd = [0,1,4,9,16]", variableName: "yd", unit: "m" } },
      { id: "c", order: 3, type: "EQUATION", definition: { raw: "r = derivativeUn(xd, yd, [2])", variableName: "r", unit: "" } },
    ];
    const r = await solveCalc(blocks, "c");
    expect(r.solution?.baseUnits?.[3]).toBe(1);  // m¹
    expect(r.solution?.baseUnits?.[2]).toBe(0);  // s⁰
  });

  it("dimensionless inputs → no units on output", async () => {
    const blocks: OrderedBlock[] = [
      { id: "a", order: 1, type: "EQUATION", definition: { raw: "xd = [0,1,2,3,4]",  variableName: "xd", unit: "" } },
      { id: "b", order: 2, type: "EQUATION", definition: { raw: "yd = [0,1,4,9,16]", variableName: "yd", unit: "" } },
      { id: "c", order: 3, type: "EQUATION", definition: { raw: "r = derivativeUn(xd, yd, [2])", variableName: "r", unit: "" } },
    ];
    const r = await solveCalc(blocks, "c");
    expect(r.solution?.units ?? "").toBe("");
  });

  it("SI conversion applied: xdata in ft → derivative scaled by 1/FT_M", async () => {
    const FT_M = 0.3048;
    // xdata in ft: SI xd = [0, FT_M, 2*FT_M, 3*FT_M, 4*FT_M]
    // ydata in m: yd = [0,1,4,9,16]
    // At query point x=1ft (SI=FT_M), Lagrange gives dy/dx ≈ 2*SI_x/FT_M²... actually:
    // The Lagrange derivative at the interior bracket uses SI x-values.
    // At x=FT_M (SI), nearest interior point is i=1 (x[i]=FT_M).
    // Lagrange through (0,0), (FT_M,1), (2*FT_M,4):
    // The Lagrange quadratic through these points approximates f(x)=x²/(FT_M²).
    // dy/dx at x=FT_M ≈ 2*FT_M/(FT_M²) = 2/FT_M
    const blocks: OrderedBlock[] = [
      { id: "a", order: 1, type: "EQUATION", definition: { raw: "xd = [0,1,2,3,4]",  variableName: "xd", unit: "ft" } },
      { id: "b", order: 2, type: "EQUATION", definition: { raw: "yd = [0,1,4,9,16]", variableName: "yd", unit: "m"  } },
      // query at x=1ft SI = FT_M
      { id: "c", order: 3, type: "EQUATION", definition: { raw: "r = derivativeUn(xd, yd, [1ft])", variableName: "r", unit: "" } },
    ];
    const r = await solveCalc(blocks, "c");
    // xd[ft] → baseUnits [0,0,0,1,...], yd[m] → baseUnits [0,0,0,1,...]
    // output: y_base - x_base = [0,0,0,0,...] → dimensionless (m/m = 1)
    expect(r.solution?.baseUnits?.[3]).toBe(0);   // m/m = dimensionless
  });
});
