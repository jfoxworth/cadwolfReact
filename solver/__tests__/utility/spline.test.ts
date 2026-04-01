/**
 * Tests for spline() — solver/functions/utility/spline.ts
 *
 * Natural cubic spline interpolation.
 * spline(x, y, xi) — fits a piecewise cubic through (x,y) knots and
 * evaluates at query points xi.
 *
 * Natural BC: second derivative is 0 at both endpoints.
 *
 * Key properties verified:
 *   - Interpolates exactly at knots
 *   - Agrees with linear interpolation for collinear data
 *   - Smooth through a known parabola (exact polynomial reproduction)
 *   - Monotone on simple monotone data
 *   - Handles scalar and vector xi
 */

import { describe, it, expect } from "vitest";
import { spline } from "../../functions/utility/spline";
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

/** Build a row-vector Matrix from an array */
function rv(...vals: number[]): Record<string, number> {
  const m: Record<string, number> = {};
  vals.forEach((v, i) => { m[`0-${i}`] = v; });
  return m;
}

// ── Interpolation at knots ─────────────────────────────────────────────────────

describe("spline — interpolates exactly at knots", () => {
  const x = rv(0, 1, 2, 3);
  const y = rv(0, 1, 4, 9); // y = x² but deliberately not collinear

  it("spline(x, y, 0) = y[0] = 0", async () => {
    const r = await spline([x, y, { "0-0": 0 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 8);
  });

  it("spline(x, y, 1) = y[1] = 1", async () => {
    const r = await spline([x, y, { "0-0": 1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 8);
  });

  it("spline(x, y, 2) = y[2] = 4", async () => {
    const r = await spline([x, y, { "0-0": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(4, 8);
  });

  it("spline(x, y, 3) = y[3] = 9", async () => {
    const r = await spline([x, y, { "0-0": 3 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(9, 8);
  });
});

// ── Linear data → exact linear interpolation ─────────────────────────────────

describe("spline — collinear knots reproduce linear function", () => {
  // y = 2x + 1
  const x = rv(0, 1, 2, 3, 4);
  const y = rv(1, 3, 5, 7, 9);

  it("midpoint between knots", async () => {
    const r = await spline([x, y, { "0-0": 0.5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(2, 6); // 2*0.5+1
  });

  it("quarter point", async () => {
    const r = await spline([x, y, { "0-0": 1.25 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(3.5, 6); // 2*1.25+1
  });
});

// ── Polynomial reproduction ───────────────────────────────────────────────────

describe("spline — quadratic data", () => {
  // Natural cubic spline does NOT reproduce polynomials of degree > 2 in general,
  // but for quadratic data (y=x²) with 5+ knots the interior values are close.
  const xs = [0, 1, 2, 3, 4, 5];
  const x  = rv(...xs);
  const y  = rv(...xs.map((v) => v * v));

  it("interpolates exactly at all knots", async () => {
    for (let i = 0; i < xs.length; i++) {
      const r = await spline([x, y, { "0-0": xs[i] }], ctx("x=0"));
      expect(r["0-0"]).toBeCloseTo(xs[i] * xs[i], 7);
    }
  });

  it("interior midpoints are close to x²", async () => {
    // At x=1.5, x²=2.25. Spline may differ slightly due to natural BC.
    const r = await spline([x, y, { "0-0": 1.5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1.5 * 1.5, 1); // within ~0.1
  });
});

// ── Sine wave ─────────────────────────────────────────────────────────────────

describe("spline — sine wave (smooth function)", () => {
  const n = 9;
  const xArr = Array.from({ length: n }, (_, i) => (i / (n - 1)) * 2 * Math.PI);
  const yArr = xArr.map(Math.sin);
  const xMat = rv(...xArr);
  const yMat = rv(...yArr);

  it("interpolates exactly at all knots", async () => {
    for (let i = 0; i < n; i++) {
      const r = await spline([xMat, yMat, { "0-0": xArr[i] }], ctx("x=0"));
      expect(r["0-0"]).toBeCloseTo(yArr[i], 8);
    }
  });

  it("midpoint between first two knots is close to sin(x)", async () => {
    const t  = (xArr[0] + xArr[1]) / 2;
    const r  = await spline([xMat, yMat, { "0-0": t }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.sin(t), 2);
  });
});

// ── Vector query ──────────────────────────────────────────────────────────────

describe("spline — vector xi returns vector output", () => {
  const x = rv(0, 1, 2, 3);
  const y = rv(0, 1, 0, 1);

  it("query at all knots returns all knot values", async () => {
    const xi = rv(0, 1, 2, 3);
    const r  = await spline([x, y, xi], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(4);
    expect(r["0-0"]).toBeCloseTo(0, 8);
    expect(r["0-1"]).toBeCloseTo(1, 8);
    expect(r["0-2"]).toBeCloseTo(0, 8);
    expect(r["0-3"]).toBeCloseTo(1, 8);
  });

  it("output is a row vector", async () => {
    const xi = rv(0, 0.5, 1);
    const r  = await spline([x, y, xi], ctx("x=0"));
    for (const k of Object.keys(r)) expect(k.startsWith("0-")).toBe(true);
  });

  it("output length matches xi length", async () => {
    const xi = rv(0, 0.25, 0.5, 0.75, 1.0, 1.5, 2.0);
    const r  = await spline([x, y, xi], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(7);
  });
});

// ── Monotonicity ──────────────────────────────────────────────────────────────

describe("spline — monotone knots", () => {
  it("interpolated values remain in range of knot y-values for monotone data", async () => {
    const x = rv(0, 1, 2, 3, 4);
    const y = rv(1, 2, 4, 8, 16); // exponential growth
    const xi = rv(0.5, 1.5, 2.5, 3.5);
    const r  = await spline([x, y, xi], ctx("x=0"));
    // Each interpolated point should lie between its surrounding knots
    expect(r["0-0"]).toBeGreaterThan(1);
    expect(r["0-0"]).toBeLessThan(2);
    expect(r["0-1"]).toBeGreaterThan(2);
    expect(r["0-1"]).toBeLessThan(4);
  });
});

// ── Edge cases ────────────────────────────────────────────────────────────────

describe("spline — edge cases", () => {
  it("two knots → linear interpolation", async () => {
    const x = rv(0, 10);
    const y = rv(0, 5);
    const r = await spline([x, y, { "0-0": 4 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(2, 6); // linear: 5 * (4/10) = 2
  });

  it("query at exact knot boundary (right end)", async () => {
    const x = rv(0, 1, 2);
    const y = rv(3, 5, 3);
    const r = await spline([x, y, { "0-0": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(3, 8);
  });
});

// ── Pipeline test ─────────────────────────────────────────────────────────────

describe("spline — pipeline", () => {
  it("evaluates at a single query point via documentEquations", async () => {
    const c = ctx("z = spline(x, y, xi)");
    c.documentEquations = [
      makeVec("x",  [0, 1, 2, 3], -3),
      makeVec("y",  [0, 1, 4, 9], -2),
      makeVec("xi", [1],          -1),
    ];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 6);
  });
});
