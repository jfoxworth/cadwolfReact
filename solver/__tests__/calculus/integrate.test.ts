/**
 * Tests for integrate() — solver/functions/calculus/integrate.ts
 *
 * Formula: trapezoidal integration of unequally-spaced (x, y) data.
 *   integrate(xdata, ydata)
 *   Returns a scalar: total area = Σ 0.5*(x[i+1]-x[i])*(y[i]+y[i+1])
 *   Requires ≥ 5 points — returns { "0-0": 0 } otherwise.
 *
 * Direct-call tests:
 *   - n < 5 → { "0-0": 0 }
 *   - constant y=1 → area = (x_max - x_min)
 *   - linear y=x, x=[0,1,2,3,4] → area = 8  (exact for trapezoid rule)
 *   - y=x², x=[0,1,2,3,4] → area ≈ 22 (trapezoidal overestimates)
 *   - non-uniform x spacing → correct area
 *   - negative y values → signed area
 *
 * Pipeline tests:
 *   - integrate([0,1,2,3,4], [1,1,1,1,1]) → 4
 *   - integrate([0,1,2,3,4], [0,1,2,3,4]) → 8
 *   - via documentEquations vectors
 *
 * Unit tests:
 *   - x[s], y[m/s] → output baseUnits = m  (s¹ + m¹ s⁻¹ → m¹)
 *   - x[s], y[m]   → output baseUnits = m·s
 *   - x[m], y[N]   → output baseUnits = J (= N·m = kg·m²·s⁻²)
 *   - dimensionless inputs → no units
 *   - SI conversion applied: x in ft, y in m/s → numeric value uses SI x values
 */

import { describe, it, expect } from "vitest";
import { integrate } from "../../functions/calculus/integrate";
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

async function integ(xVals: number[], yVals: number[]) {
  return integrate([vec(xVals), vec(yVals)], ctx("x=0"));
}

// ── Direct call tests ──────────────────────────────────────────────────────────

describe("integrate — direct call: degenerate (n < 5)", () => {
  it("n=1 → { '0-0': 0 }", async () => {
    const r = await integ([0], [1]);
    expect(r["0-0"]).toBe(0);
  });

  it("n=4 → { '0-0': 0 }", async () => {
    const r = await integ([0, 1, 2, 3], [1, 1, 1, 1]);
    expect(r["0-0"]).toBe(0);
  });
});

describe("integrate — direct call: constant y", () => {
  it("y=1, x=[0..4] → area = 4", async () => {
    const r = await integ([0, 1, 2, 3, 4], [1, 1, 1, 1, 1]);
    expect(r["0-0"]).toBeCloseTo(4, 10);
  });

  it("y=3, x=[0,2,4,6,8] → area = 3*(8-0) = 24", async () => {
    const r = await integ([0, 2, 4, 6, 8], [3, 3, 3, 3, 3]);
    expect(r["0-0"]).toBeCloseTo(24, 10);
  });
});

describe("integrate — direct call: linear y (exact for trapezoidal)", () => {
  it("y=x, x=[0,1,2,3,4] → area = 8 (exact)", async () => {
    // ∫₀⁴ x dx = [x²/2]₀⁴ = 8
    const r = await integ([0, 1, 2, 3, 4], [0, 1, 2, 3, 4]);
    expect(r["0-0"]).toBeCloseTo(8, 10);
  });

  it("y=2x, x=[0,1,2,3,4] → area = 16 (exact)", async () => {
    const r = await integ([0, 1, 2, 3, 4], [0, 2, 4, 6, 8]);
    expect(r["0-0"]).toBeCloseTo(16, 10);
  });
});

describe("integrate — direct call: quadratic y (trapezoidal approximation)", () => {
  it("y=x², x=[0,1,2,3,4] → area ≈ 22 (exact is 64/3≈21.33)", async () => {
    // Trapezoid: 0.5+2.5+6.5+12.5 = 22
    const r = await integ([0, 1, 2, 3, 4], [0, 1, 4, 9, 16]);
    expect(r["0-0"]).toBeCloseTo(22, 10);
  });
});

describe("integrate — direct call: non-uniform spacing", () => {
  it("y=1, x=[0,1,3,6,10] → area = 10", async () => {
    // Each trapezoid: (1-0)*1 + (3-1)*1 + (6-3)*1 + (10-6)*1 = 1+2+3+4 = 10
    const r = await integ([0, 1, 3, 6, 10], [1, 1, 1, 1, 1]);
    expect(r["0-0"]).toBeCloseTo(10, 10);
  });

  it("y=x, x=[0,1,3,6,10] → area = 50 (exact for linear)", async () => {
    // ∫₀¹⁰ x dx = 50
    const r = await integ([0, 1, 3, 6, 10], [0, 1, 3, 6, 10]);
    expect(r["0-0"]).toBeCloseTo(50, 10);
  });
});

describe("integrate — direct call: signed area", () => {
  it("y=-1, x=[0,1,2,3,4] → area = -4", async () => {
    const r = await integ([0, 1, 2, 3, 4], [-1, -1, -1, -1, -1]);
    expect(r["0-0"]).toBeCloseTo(-4, 10);
  });

  it("y crosses zero: y=[-2,-1,0,1,2] → area = 0 (symmetric)", async () => {
    const r = await integ([0, 1, 2, 3, 4], [-2, -1, 0, 1, 2]);
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("integrate — pipeline: constant y", () => {
  it("integrate([0,1,2,3,4], [1,1,1,1,1]) → 4", async () => {
    const r = await runPipeline(ctx("x = integrate([0,1,2,3,4], [1,1,1,1,1])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(4, 4);
  });
});

describe("integrate — pipeline: linear y", () => {
  it("integrate([0,1,2,3,4], [0,1,2,3,4]) → 8", async () => {
    const r = await runPipeline(ctx("x = integrate([0,1,2,3,4], [0,1,2,3,4])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(8, 4);
  });

  it("n < 5 inline → 0", async () => {
    const r = await runPipeline(ctx("x = integrate([0,1,2,3], [1,1,1,1])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });
});

describe("integrate — pipeline: vectors via documentEquations", () => {
  it("integrate(xv, yv) where xv=[0..4], yv=[1,1,1,1,1] → 4", async () => {
    const c = ctx("area = integrate(xv, yv)");
    c.documentEquations = [
      makeVec("xv", [0, 1, 2, 3, 4], -2),
      makeVec("yv", [1, 1, 1, 1, 1], -1),
    ];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(4, 4);
  });

  it("integrate(xv, yv) where xv=[0..4], yv=[0,1,2,3,4] → 8", async () => {
    const c = ctx("area = integrate(xv, yv)");
    c.documentEquations = [
      makeVec("xv", [0, 1, 2, 3, 4], -2),
      makeVec("yv", [0, 1, 2, 3, 4], -1),
    ];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(8, 4);
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

describe("integrate — unit tests: output unit = x_unit × y_unit", () => {
  it("x[s], y[m/s] → baseUnits m¹ (s cancels)", async () => {
    const blocks: OrderedBlock[] = [
      { id: "a", order: 1, type: "EQUATION", definition: { raw: "xv = [0,1,2,3,4]", variableName: "xv", unit: "s"   } },
      { id: "b", order: 2, type: "EQUATION", definition: { raw: "yv = [0,1,2,3,4]", variableName: "yv", unit: "m/s" } },
      { id: "c", order: 3, type: "EQUATION", definition: { raw: "r = integrate(xv, yv)", variableName: "r", unit: "" } },
    ];
    const r = await solveCalc(blocks, "c");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.baseUnits?.[3]).toBe(1);  // m¹
    expect(r.solution?.baseUnits?.[2]).toBe(0);  // s cancels
    expect(r.solution?.real?.["0-0"]).toBeCloseTo(8, 3);
  });

  it("x[s], y[m] → baseUnits m¹ s¹", async () => {
    const blocks: OrderedBlock[] = [
      { id: "a", order: 1, type: "EQUATION", definition: { raw: "xv = [0,1,2,3,4]", variableName: "xv", unit: "s" } },
      { id: "b", order: 2, type: "EQUATION", definition: { raw: "yv = [1,1,1,1,1]", variableName: "yv", unit: "m" } },
      { id: "c", order: 3, type: "EQUATION", definition: { raw: "r = integrate(xv, yv)", variableName: "r", unit: "" } },
    ];
    const r = await solveCalc(blocks, "c");
    expect(r.solution?.baseUnits?.[3]).toBe(1);  // m¹
    expect(r.solution?.baseUnits?.[2]).toBe(1);  // s¹
  });

  it("x[m], y[N] → baseUnits kg¹ m² s⁻² (= J)", async () => {
    // N = kg·m·s⁻², ×m = kg·m²·s⁻²
    const blocks: OrderedBlock[] = [
      { id: "a", order: 1, type: "EQUATION", definition: { raw: "xv = [0,1,2,3,4]", variableName: "xv", unit: "m" } },
      { id: "b", order: 2, type: "EQUATION", definition: { raw: "yv = [1,1,1,1,1]", variableName: "yv", unit: "N" } },
      { id: "c", order: 3, type: "EQUATION", definition: { raw: "r = integrate(xv, yv)", variableName: "r", unit: "" } },
    ];
    const r = await solveCalc(blocks, "c");
    // baseUnits for J: A=0,K=0,s=-2,m=2,kg=1,cd=0,mol=0,rad=0
    expect(r.solution?.baseUnits?.[4]).toBe(1);   // kg¹
    expect(r.solution?.baseUnits?.[3]).toBe(2);   // m²
    expect(r.solution?.baseUnits?.[2]).toBe(-2);  // s⁻²
  });

  it("x dimensionless, y[m/s] → baseUnits m¹ s⁻¹", async () => {
    const blocks: OrderedBlock[] = [
      { id: "a", order: 1, type: "EQUATION", definition: { raw: "xv = [0,1,2,3,4]", variableName: "xv", unit: ""    } },
      { id: "b", order: 2, type: "EQUATION", definition: { raw: "yv = [0,1,2,3,4]", variableName: "yv", unit: "m/s" } },
      { id: "c", order: 3, type: "EQUATION", definition: { raw: "r = integrate(xv, yv)", variableName: "r", unit: "" } },
    ];
    const r = await solveCalc(blocks, "c");
    expect(r.solution?.baseUnits?.[3]).toBe(1);   // m¹
    expect(r.solution?.baseUnits?.[2]).toBe(-1);  // s⁻¹
  });

  it("dimensionless inputs → no units on output", async () => {
    const blocks: OrderedBlock[] = [
      { id: "a", order: 1, type: "EQUATION", definition: { raw: "xv = [0,1,2,3,4]", variableName: "xv", unit: "" } },
      { id: "b", order: 2, type: "EQUATION", definition: { raw: "yv = [1,1,1,1,1]", variableName: "yv", unit: "" } },
      { id: "c", order: 3, type: "EQUATION", definition: { raw: "r = integrate(xv, yv)", variableName: "r", unit: "" } },
    ];
    const r = await solveCalc(blocks, "c");
    expect(r.solution?.units ?? "").toBe("");
  });

  it("x in ft, y constant 1 → area uses raw vector values (vectors are not SI-scaled)", async () => {
    // Note: vector/matrix variables passed to functions are NOT SI-scaled.
    // xv = [0,1,2,3,4] (raw values, ft unit metadata only for unit propagation)
    // yv = [1,1,1,1,1] (dimensionless)
    // integral = trapezoid of raw values = 4
    const blocks: OrderedBlock[] = [
      { id: "a", order: 1, type: "EQUATION", definition: { raw: "xv = [0,1,2,3,4]", variableName: "xv", unit: "ft" } },
      { id: "b", order: 2, type: "EQUATION", definition: { raw: "yv = [1,1,1,1,1]", variableName: "yv", unit: ""   } },
      { id: "c", order: 3, type: "EQUATION", definition: { raw: "r = integrate(xv, yv)", variableName: "r", unit: "" } },
    ];
    const r = await solveCalc(blocks, "c");
    expect(r.solution?.real?.["0-0"]).toBeCloseTo(4, 4);
  });

  it("explicit output unit on block overrides propagation", async () => {
    const blocks: OrderedBlock[] = [
      { id: "a", order: 1, type: "EQUATION", definition: { raw: "xv = [0,1,2,3,4]", variableName: "xv", unit: "s"   } },
      { id: "b", order: 2, type: "EQUATION", definition: { raw: "yv = [0,1,2,3,4]", variableName: "yv", unit: "m/s" } },
      { id: "c", order: 3, type: "EQUATION", definition: { raw: "r = integrate(xv, yv)", variableName: "r", unit: "m" } },
    ];
    const r = await solveCalc(blocks, "c");
    expect(r.solution?.units).toBe("m");
    expect(r.solution?.real?.["0-0"]).toBeCloseTo(8, 3);
  });
});
