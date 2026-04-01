/**
 * Tests for derivative() — solver/functions/calculus/derivative.ts
 *
 * Formula: centered finite-difference derivative of uniformly-spaced data
 *   derivative(ydata, xspacing, order, accuracy)
 *   order 1–4, accuracy 1 = O(h²), accuracy 2 = O(h⁴)
 *   Returns a shorter row vector (boundary points are dropped).
 *   Requires ≥ 5 input points — returns { "0-0": 0 } otherwise.
 *
 * Output sizes (n = number of input points):
 *   order=1, acc=1 → n-2 points  (interior: i=1..n-2)
 *   order=1, acc=2 → n-4 points  (interior: i=2..n-3)
 *   order=2, acc=1 → n-2 points
 *   order=2, acc=2 → n-4 points
 *   order=3, acc=1 → n-4 points
 *   order=3, acc=2 → n-6 points
 *   order=4, acc=1 → n-4 points
 *   order=4, acc=2 → n-6 points
 *
 * Direct-call tests:
 *   - n < 5 → { "0-0": 0 }
 *   - f=x², h=1, order=1, acc=1 → interior f'≈2x
 *   - f=x², h=1, order=1, acc=2 → interior f'≈2x (higher accuracy)
 *   - f=x², h=1, order=2, acc=1 → interior f''≈2
 *   - f=x², h=1, order=2, acc=2 → interior f''≈2
 *   - f=x², h=1, order=3, acc=1 → f'''≈0 (x² has no 3rd derivative)
 *   - f=x², h=1, order=4, acc=1 → f''''≈0
 *   - h≠1: scaling is correct
 *
 * Pipeline tests:
 *   - derivative([0,1,4,9,16], 1, 1, 1) → first interior value ≈ 2
 *   - via documentEquations vectors
 *
 * Unit tests:
 *   - y[m], h[s], order=1 → output baseUnits = m/s  (m¹ s⁻¹)
 *   - y[m], h[s], order=2 → output baseUnits = m/s² (m¹ s⁻²)
 *   - y[kg], h[s], order=1 → output baseUnits = kg/s
 *   - dimensionless inputs → no units on output
 *   - explicit output unit on block overrides propagation
 */

import { describe, it, expect } from "vitest";
import { derivative } from "../../functions/calculus/derivative";
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

// f(x) = x² sampled at integer points, h=1
const F_X2_5  = { "0-0": 0, "0-1": 1, "0-2": 4,  "0-3": 9,  "0-4": 16 };           // n=5
const F_X2_6  = { "0-0": 0, "0-1": 1, "0-2": 4,  "0-3": 9,  "0-4": 16, "0-5": 25 }; // n=6
const F_X2_8  = { "0-0": 0, "0-1": 1, "0-2": 4,  "0-3": 9,  "0-4": 16, "0-5": 25, "0-6": 36, "0-7": 49 }; // n=8
const H1 = { "0-0": 1 };
const H2 = { "0-0": 2 };

async function deriv(f: Record<string,number>, h: number, order: number, accuracy: number) {
  return derivative([f, { "0-0": h }, { "0-0": order }, { "0-0": accuracy }], ctx("x=0"));
}

// ── Direct call tests ──────────────────────────────────────────────────────────

describe("derivative — direct call: degenerate (n < 5)", () => {
  it("n=1 → { '0-0': 0 }", async () => {
    const r = await deriv({ "0-0": 5 }, 1, 1, 1);
    expect(r["0-0"]).toBe(0);
    expect(Object.keys(r)).toHaveLength(1);
  });

  it("n=4 → { '0-0': 0 }", async () => {
    const r = await deriv({ "0-0": 0, "0-1": 1, "0-2": 4, "0-3": 9 }, 1, 1, 1);
    expect(r["0-0"]).toBe(0);
  });
});

describe("derivative — direct call: order=1, accuracy=1, f=x², h=1", () => {
  it("n=5 → 3 interior values ≈ 2x", async () => {
    const r = await deriv(F_X2_5, 1, 1, 1);
    // f'(x)=2x at x=1,2,3
    expect(r["0-0"]).toBeCloseTo(2, 6);
    expect(r["0-1"]).toBeCloseTo(4, 6);
    expect(r["0-2"]).toBeCloseTo(6, 6);
    expect(Object.keys(r)).toHaveLength(3);
  });

  it("h=2 → same stencil scaled by 1/(2h)", async () => {
    // f = [0,4,16,36,64] = (2x)² at x=0,2,4,6,8 but sampled h=2 apart
    // Use plain integers and h=2: f'(x)=2x, stencil gives (f[i+1]-f[i-1])/(2*2)
    // f=[0,1,4,9,16] with h=2 → d/dx ≈ (4-0)/(4)=1 at i=1 (which corresponds to x=2, f'=2*2=4/2=2?)
    // Actually with h=2: the stencil gives derivative in "units of 1/h", so
    // r["0-0"] = (f[2]-f[0])/(2*2) = (4-0)/4 = 1  (approximates df/dx at index 1 as if x spacing = 2)
    const r = await deriv(F_X2_5, 2, 1, 1);
    expect(r["0-0"]).toBeCloseTo(1, 6);   // (4-0)/(2*2) = 1
    expect(r["0-1"]).toBeCloseTo(2, 6);   // (9-1)/(2*2) = 2
    expect(r["0-2"]).toBeCloseTo(3, 6);   // (16-4)/(2*2) = 3
  });
});

describe("derivative — direct call: order=1, accuracy=2, f=x², h=1", () => {
  it("n=6 → 2 interior values ≈ 2x (O(h⁴) stencil)", async () => {
    const r = await deriv(F_X2_6, 1, 1, 2);
    // Interior: i=2 and i=3
    // i=2: (-f[4]+8f[3]-8f[1]+f[0])/(12) = (-16+72-8+0)/12 = 48/12 = 4 ✓ (f'(2)=4)
    expect(r["0-0"]).toBeCloseTo(4, 6);
    // i=3: (-f[5]+8f[4]-8f[2]+f[1])/(12) = (-25+128-32+1)/12 = 72/12 = 6 ✓ (f'(3)=6)
    expect(r["0-1"]).toBeCloseTo(6, 6);
    expect(Object.keys(r)).toHaveLength(2);
  });
});

describe("derivative — direct call: order=2, accuracy=1, f=x², h=1", () => {
  it("n=5 → 3 interior values ≈ 2 (constant 2nd derivative)", async () => {
    const r = await deriv(F_X2_5, 1, 2, 1);
    expect(r["0-0"]).toBeCloseTo(2, 6);
    expect(r["0-1"]).toBeCloseTo(2, 6);
    expect(r["0-2"]).toBeCloseTo(2, 6);
  });
});

describe("derivative — direct call: order=2, accuracy=2, f=x², h=1", () => {
  it("n=6 → 2 interior values ≈ 2", async () => {
    const r = await deriv(F_X2_6, 1, 2, 2);
    expect(r["0-0"]).toBeCloseTo(2, 6);
    expect(r["0-1"]).toBeCloseTo(2, 6);
    expect(Object.keys(r)).toHaveLength(2);
  });
});

describe("derivative — direct call: order=3, f=x², h=1", () => {
  it("n=5, acc=1 → 1 interior value ≈ 0 (f'''=0 for quadratic)", async () => {
    const r = await deriv(F_X2_5, 1, 3, 1);
    expect(r["0-0"]).toBeCloseTo(0, 6);
    expect(Object.keys(r)).toHaveLength(1);
  });
});

describe("derivative — direct call: order=4, f=x², h=1", () => {
  it("n=5, acc=1 → 1 interior value ≈ 0 (f''''=0 for quadratic)", async () => {
    const r = await deriv(F_X2_5, 1, 4, 1);
    expect(r["0-0"]).toBeCloseTo(0, 6);
  });

  it("n=8, acc=2 → 2 interior values ≈ 0", async () => {
    const r = await deriv(F_X2_8, 1, 4, 2);
    expect(r["0-0"]).toBeCloseTo(0, 5);
    expect(r["0-1"]).toBeCloseTo(0, 5);
    expect(Object.keys(r)).toHaveLength(2);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("derivative — pipeline: order=1, accuracy=1", () => {
  it("derivative([0,1,4,9,16], 1, 1, 1) → first value ≈ 2", async () => {
    const r = await runPipeline(ctx("x = derivative([0,1,4,9,16], 1, 1, 1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(2, 4);
    expect(r.solution.real["0-2"]).toBeCloseTo(6, 4);
  });

  it("n < 5 inline → 0", async () => {
    const r = await runPipeline(ctx("x = derivative([0,1,4,9], 1, 1, 1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });
});

describe("derivative — pipeline: order=2, accuracy=1", () => {
  it("derivative([0,1,4,9,16], 1, 2, 1) → all values ≈ 2", async () => {
    const r = await runPipeline(ctx("x = derivative([0,1,4,9,16], 1, 2, 1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(2, 4);
    expect(r.solution.real["0-2"]).toBeCloseTo(2, 4);
  });
});

describe("derivative — pipeline: vectors via documentEquations", () => {
  it("derivative(y, h, 1, 1) where y=[0,1,4,9,16], h=1 → first value ≈ 2", async () => {
    const c = ctx("dydx = derivative(y, h, 1, 1)");
    c.documentEquations = [
      makeVec("y", [0, 1, 4, 9, 16], -2),
      { blockId: "hb", order: -1, variableName: "h",
        solution: { real: { "0-0": 1 }, imag: {}, size: "1x1", units: "", baseUnits: emptyBase, multiplier: 1 },
        error: null },
    ];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(2, 4);
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

describe("derivative — unit tests: output unit = y_unit / h_unit^order", () => {
  it("y[m], h[s], order=1 → baseUnits m¹ s⁻¹", async () => {
    const blocks: OrderedBlock[] = [
      { id: "a", order: 1, type: "EQUATION", definition: { raw: "y = [0,1,4,9,16]", variableName: "y", unit: "m" } },
      { id: "b", order: 2, type: "EQUATION", definition: { raw: "h = 1",             variableName: "h", unit: "s" } },
      { id: "c", order: 3, type: "EQUATION", definition: { raw: "r = derivative(y, h, 1, 1)", variableName: "r", unit: "" } },
    ];
    const r = await solveCalc(blocks, "c");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.baseUnits?.[3]).toBe(1);   // m¹
    expect(r.solution?.baseUnits?.[2]).toBe(-1);  // s⁻¹
    expect(r.solution?.real?.["0-0"]).toBeCloseTo(2, 3);
  });

  it("y[m], h[s], order=2 → baseUnits m¹ s⁻²", async () => {
    const blocks: OrderedBlock[] = [
      { id: "a", order: 1, type: "EQUATION", definition: { raw: "y = [0,1,4,9,16,25]", variableName: "y", unit: "m" } },
      { id: "b", order: 2, type: "EQUATION", definition: { raw: "h = 1",               variableName: "h", unit: "s" } },
      { id: "c", order: 3, type: "EQUATION", definition: { raw: "r = derivative(y, h, 2, 1)", variableName: "r", unit: "" } },
    ];
    const r = await solveCalc(blocks, "c");
    expect(r.solution?.baseUnits?.[3]).toBe(1);
    expect(r.solution?.baseUnits?.[2]).toBe(-2);
    expect(r.solution?.real?.["0-0"]).toBeCloseTo(2, 3);
  });

  it("y[kg], h[s], order=1 → baseUnits kg¹ s⁻¹", async () => {
    const blocks: OrderedBlock[] = [
      { id: "a", order: 1, type: "EQUATION", definition: { raw: "y = [0,1,4,9,16]", variableName: "y", unit: "kg" } },
      { id: "b", order: 2, type: "EQUATION", definition: { raw: "h = 1",             variableName: "h", unit: "s"  } },
      { id: "c", order: 3, type: "EQUATION", definition: { raw: "r = derivative(y, h, 1, 1)", variableName: "r", unit: "" } },
    ];
    const r = await solveCalc(blocks, "c");
    expect(r.solution?.baseUnits?.[4]).toBe(1);   // kg¹
    expect(r.solution?.baseUnits?.[2]).toBe(-1);  // s⁻¹
  });

  it("y[m], h dimensionless → output baseUnits = m (y_base - 0)", async () => {
    const blocks: OrderedBlock[] = [
      { id: "a", order: 1, type: "EQUATION", definition: { raw: "y = [0,1,4,9,16]", variableName: "y", unit: "m" } },
      { id: "b", order: 2, type: "EQUATION", definition: { raw: "h = 1",             variableName: "h", unit: "" } },
      { id: "c", order: 3, type: "EQUATION", definition: { raw: "r = derivative(y, h, 1, 1)", variableName: "r", unit: "" } },
    ];
    const r = await solveCalc(blocks, "c");
    expect(r.solution?.baseUnits?.[3]).toBe(1);  // m¹
    expect(r.solution?.baseUnits?.[2]).toBe(0);  // s⁰
  });

  it("dimensionless y and h → no units on output", async () => {
    const blocks: OrderedBlock[] = [
      { id: "a", order: 1, type: "EQUATION", definition: { raw: "y = [0,1,4,9,16]", variableName: "y", unit: "" } },
      { id: "b", order: 2, type: "EQUATION", definition: { raw: "h = 1",             variableName: "h", unit: "" } },
      { id: "c", order: 3, type: "EQUATION", definition: { raw: "r = derivative(y, h, 1, 1)", variableName: "r", unit: "" } },
    ];
    const r = await solveCalc(blocks, "c");
    expect(r.solution?.units ?? "").toBe("");
  });

  it("explicit output unit on block overrides propagation", async () => {
    const blocks: OrderedBlock[] = [
      { id: "a", order: 1, type: "EQUATION", definition: { raw: "y = [0,1,4,9,16]", variableName: "y", unit: "m" } },
      { id: "b", order: 2, type: "EQUATION", definition: { raw: "h = 1",             variableName: "h", unit: "s" } },
      { id: "c", order: 3, type: "EQUATION", definition: { raw: "r = derivative(y, h, 1, 1)", variableName: "r", unit: "m/s" } },
    ];
    const r = await solveCalc(blocks, "c");
    // solution.units is LaTeX-formatted by step 28 (m/s → \frac{m}{s})
    expect(r.solution?.units).toBe("\\frac{m}{s}");
    // Verify the correct unit dimensions were applied (m¹ s⁻¹)
    expect(r.solution?.baseUnits?.[3]).toBe(1);   // m¹
    expect(r.solution?.baseUnits?.[2]).toBe(-1);  // s⁻¹
    expect(r.solution?.real?.["0-0"]).toBeCloseTo(2, 3);
  });

  it("y[m], h[s] with ft input → SI values used in stencil", async () => {
    // h = 1ft → SI h = 0.3048 m; the derivative is scaled by 1/h
    const FT_M = 0.3048;
    const blocks: OrderedBlock[] = [
      // y = 0,1,4,9,16 in metres
      { id: "a", order: 1, type: "EQUATION", definition: { raw: "y = [0,1,4,9,16]", variableName: "y", unit: "m" } },
      // h = 1ft → SI = 0.3048
      { id: "b", order: 2, type: "EQUATION", definition: { raw: "h = 1",             variableName: "h", unit: "ft" } },
      { id: "c", order: 3, type: "EQUATION", definition: { raw: "r = derivative(y, h, 1, 1)", variableName: "r", unit: "" } },
    ];
    const r = await solveCalc(blocks, "c");
    // stencil: (f[2]-f[0])/(2*0.3048) = 4/(2*0.3048) ≈ 6.561
    expect(r.solution?.real?.["0-0"]).toBeCloseTo(4 / (2 * FT_M), 2);
  });
});
