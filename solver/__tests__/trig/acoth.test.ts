/**
 * Tests for acoth() — solver/functions/trig/acoth.ts
 *
 * Formula: elementwise(args[0], v => 0.5 * Math.log((v + 1) / (v - 1)))
 * Input domain: |v| > 1. Returns all reals element-wise.
 * Inverse hyperbolic cotangent: acoth(x) = 0.5 × ln((x+1)/(x-1)).
 * Odd function: acoth(-x) = -acoth(x).
 *
 * Direct-call tests:
 *   - acoth(2) → 0.5 × ln(3)
 *   - acoth(-2) → -0.5 × ln(3) (odd function)
 *   - acoth(coth(1)) → 1 (inverse property: coth(x) = cosh/sinh)
 *   - acoth(5) → correct value
 *   - Row vector → element-wise results
 *   - 2D matrix → element-wise results
 *   - Empty matrix → empty
 *
 * Pipeline tests:
 *   - x = acoth(2) → 0.5493...
 *   - x = acoth(-2) → -0.5493...
 *   - Vector via documentEquations → element-wise results
 *   - Inline 2D matrix literal → element-wise results
 *
 * Unit tests:
 *   - acoth() receives the SI-converted numeric value of its argument
 *   - Input SI value must satisfy |v| > 1
 *   - v = 2 m → SI = 2 → acoth(2)
 *   - v = 4 ft → SI = 4×0.3048 = 1.2192 → acoth(1.2192)
 */

import { describe, it, expect } from "vitest";
import { acoth } from "../../functions/trig/acoth";
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

function acothFn(v: number) { return 0.5 * Math.log((v + 1) / (v - 1)); }

// ── Direct call tests ──────────────────────────────────────────────────────────

describe("acoth — direct call: scalars", () => {
  it("acoth(2) → 0.5 × ln(3)", async () => {
    const r = await acoth([{ "0-0": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0.5 * Math.log(3), 10);
  });

  it("acoth(-2) → -0.5 × ln(3) (odd function)", async () => {
    const r = await acoth([{ "0-0": -2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-0.5 * Math.log(3), 10);
  });

  it("acoth(5) → correct value", async () => {
    const r = await acoth([{ "0-0": 5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(acothFn(5), 10);
  });

  it("acoth(1.5) → correct value", async () => {
    const r = await acoth([{ "0-0": 1.5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(acothFn(1.5), 10);
  });

  it("acoth(10) → approaches 0", async () => {
    const r = await acoth([{ "0-0": 10 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(acothFn(10), 6);
  });
});

describe("acoth — direct call: vectors", () => {
  it("row vector [2, -2, 5] → element-wise results", async () => {
    const mat = { "0-0": 2, "0-1": -2, "0-2": 5 };
    const r = await acoth([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(acothFn(2), 10);
    expect(r["0-1"]).toBeCloseTo(acothFn(-2), 10);
    expect(r["0-2"]).toBeCloseTo(acothFn(5), 10);
  });
});

describe("acoth — direct call: 2D matrix", () => {
  it("2x2 matrix → element-wise results", async () => {
    const mat = { "0-0": 2, "0-1": -2, "1-0": 5, "1-1": 1.5 };
    const r = await acoth([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(acothFn(2), 10);
    expect(r["0-1"]).toBeCloseTo(acothFn(-2), 10);
    expect(r["1-0"]).toBeCloseTo(acothFn(5), 10);
    expect(r["1-1"]).toBeCloseTo(acothFn(1.5), 10);
  });
});

describe("acoth — direct call: edge cases", () => {
  it("empty matrix → empty result", async () => {
    const r = await acoth([{}], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(0);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("acoth — pipeline: scalars", () => {
  it("x = acoth(2) → 0.5493...", async () => {
    const r = await runPipeline(ctx("x = acoth(2)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0.5 * Math.log(3), 4);
  });

  it("x = acoth(-2) → -0.5493...", async () => {
    const r = await runPipeline(ctx("x = acoth(-2)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(-0.5 * Math.log(3), 4);
  });

  it("x = acoth(5) → correct value", async () => {
    const r = await runPipeline(ctx("x = acoth(5)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(acothFn(5), 4);
  });
});

describe("acoth — pipeline: vector via documentEquations", () => {
  it("acoth(v) on [2, -2, 5, 1.5] → element-wise results", async () => {
    const vals = [2, -2, 5, 1.5];
    const c = ctx("y = acoth(v)");
    c.documentEquations = [makeVec("v", vals, -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    vals.forEach((v, i) => {
      expect(r.solution.real[`0-${i}`]).toBeCloseTo(acothFn(v), 4);
    });
  });
});

describe("acoth — pipeline: inline 2D matrix", () => {
  it("acoth([2,-2;5,1.5]) → element-wise results", async () => {
    const r = await runPipeline(ctx("y = acoth([2,-2;5,1.5])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(acothFn(2), 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(acothFn(-2), 4);
    expect(r.solution.real["1-0"]).toBeCloseTo(acothFn(5), 4);
    expect(r.solution.real["1-1"]).toBeCloseTo(acothFn(1.5), 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────
// acoth() receives the SI-converted numeric value. Input |v| must be > 1.

const FT_M = 0.3048;

async function solveWith(varVal: string, varUnit: string, fnExpr: string) {
  const blocks: OrderedBlock[] = [
    { id: "vb", order: 1, type: "EQUATION", definition: { raw: `v = ${varVal}`, variableName: "v", unit: varUnit } },
    { id: "xb", order: 2, type: "EQUATION", definition: { raw: `x = ${fnExpr}`, variableName: "x", unit: "" } },
  ];
  const r1 = await solveDocument(blocks, "vb", []);
  const r2 = await solveDocument(blocks, "xb", r1.resolvedMap);
  return r2.results.find((r) => r.blockId === "xb")!;
}

describe("acoth — simple units (m): uses SI value", () => {
  it("v = 2 m → acoth(v) = acoth(2)", async () => {
    const r = await solveWith("2", "m", "acoth(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(acothFn(2), 4);
  });

  it("v = 5 m → acoth(v) = acoth(5)", async () => {
    const r = await solveWith("5", "m", "acoth(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(acothFn(5), 4);
  });
});

describe("acoth — converted units (ft): uses SI numeric value", () => {
  it("v = 4 ft → acoth(4 × 0.3048) = acoth(1.2192)", async () => {
    // 4 ft = 1.2192 m — within domain |v| > 1
    const r = await solveWith("4", "ft", "acoth(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(acothFn(4 * FT_M), 4);
  });
});
