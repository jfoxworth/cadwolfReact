/**
 * Tests for acsch() — solver/functions/trig/acsch.ts
 *
 * Formula: elementwise(args[0], v => Math.log(1/v + Math.sqrt(1/(v*v) + 1)))
 * Input domain: all nonzero reals. Odd function. Returns all reals element-wise.
 * Inverse hyperbolic cosecant: acsch(x) = asinh(1/x) = ln(1/x + √(1/x² + 1)).
 *
 * Direct-call tests:
 *   - acsch(1) → ln(1+√2) = asinh(1)
 *   - acsch(-1) → -ln(1+√2) (odd function)
 *   - acsch(large positive) → approaches 0
 *   - acsch(1/sinh(2)) → 2 (inverse property)
 *   - Row vector → element-wise results
 *   - 2D matrix → element-wise results
 *   - Empty matrix → empty
 *
 * Pipeline tests:
 *   - x = acsch(1) → 0.8814
 *   - x = acsch(-1) → -0.8814
 *   - Vector via documentEquations → element-wise results
 *   - Inline 2D matrix literal → element-wise results
 *
 * Unit tests:
 *   - acsch() receives the SI-converted numeric value of its argument
 *   - v = 1 m → SI = 1 → acsch(1) = asinh(1)
 *   - v = 1 ft → SI = 0.3048 → acsch(0.3048)
 */

import { describe, it, expect } from "vitest";
import { acsch } from "../../functions/trig/acsch";
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

function acschFn(v: number) { return Math.log(1 / v + Math.sqrt(1 / (v * v) + 1)); }

// ── Direct call tests ──────────────────────────────────────────────────────────

describe("acsch — direct call: scalars", () => {
  it("acsch(1) → ln(1+√2) ≈ 0.8814", async () => {
    const r = await acsch([{ "0-0": 1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.asinh(1), 10);
  });

  it("acsch(-1) → -0.8814 (odd function)", async () => {
    const r = await acsch([{ "0-0": -1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-Math.asinh(1), 10);
  });

  it("acsch(2) → asinh(0.5)", async () => {
    const r = await acsch([{ "0-0": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(acschFn(2), 10);
  });

  it("acsch(1/sinh(2)) → 2 (inverse property)", async () => {
    const r = await acsch([{ "0-0": 1 / Math.sinh(2) }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(2, 8);
  });

  it("acsch(0.5) → correct value", async () => {
    const r = await acsch([{ "0-0": 0.5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(acschFn(0.5), 10);
  });
});

describe("acsch — direct call: vectors", () => {
  it("row vector [1, -1, 2] → element-wise results", async () => {
    const mat = { "0-0": 1, "0-1": -1, "0-2": 2 };
    const r = await acsch([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(acschFn(1), 10);
    expect(r["0-1"]).toBeCloseTo(acschFn(-1), 10);
    expect(r["0-2"]).toBeCloseTo(acschFn(2), 10);
  });
});

describe("acsch — direct call: 2D matrix", () => {
  it("2x2 matrix → element-wise results", async () => {
    const mat = { "0-0": 1, "0-1": -1, "1-0": 2, "1-1": 0.5 };
    const r = await acsch([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(acschFn(1), 10);
    expect(r["0-1"]).toBeCloseTo(acschFn(-1), 10);
    expect(r["1-0"]).toBeCloseTo(acschFn(2), 10);
    expect(r["1-1"]).toBeCloseTo(acschFn(0.5), 10);
  });
});

describe("acsch — direct call: edge cases", () => {
  it("empty matrix → empty result", async () => {
    const r = await acsch([{}], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(0);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("acsch — pipeline: scalars", () => {
  it("x = acsch(1) → 0.8814", async () => {
    const r = await runPipeline(ctx("x = acsch(1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.asinh(1), 4);
  });

  it("x = acsch(-1) → -0.8814", async () => {
    const r = await runPipeline(ctx("x = acsch(-1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(-Math.asinh(1), 4);
  });

  it("x = acsch(2) → correct value", async () => {
    const r = await runPipeline(ctx("x = acsch(2)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(acschFn(2), 4);
  });
});

describe("acsch — pipeline: vector via documentEquations", () => {
  it("acsch(v) on [1, -1, 2, 0.5] → element-wise results", async () => {
    const vals = [1, -1, 2, 0.5];
    const c = ctx("y = acsch(v)");
    c.documentEquations = [makeVec("v", vals, -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    vals.forEach((v, i) => {
      expect(r.solution.real[`0-${i}`]).toBeCloseTo(acschFn(v), 4);
    });
  });
});

describe("acsch — pipeline: inline 2D matrix", () => {
  it("acsch([1,-1;2,0.5]) → element-wise results", async () => {
    const r = await runPipeline(ctx("y = acsch([1,-1;2,0.5])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(acschFn(1), 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(acschFn(-1), 4);
    expect(r.solution.real["1-0"]).toBeCloseTo(acschFn(2), 4);
    expect(r.solution.real["1-1"]).toBeCloseTo(acschFn(0.5), 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────
// acsch() receives the SI-converted numeric value of its argument (must be nonzero).

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

describe("acsch — simple units (m): uses SI value", () => {
  it("v = 1 m → acsch(v) = acsch(1) = asinh(1)", async () => {
    const r = await solveWith("1", "m", "acsch(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(Math.asinh(1), 4);
  });

  it("v = 2 m → acsch(v) = acsch(2)", async () => {
    const r = await solveWith("2", "m", "acsch(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(acschFn(2), 4);
  });
});

describe("acsch — converted units (ft): uses SI numeric value", () => {
  it("acsch(1ft) → acsch(0.3048)", async () => {
    const r = await runPipeline(ctx("x = acsch(1ft)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(acschFn(FT_M), 4);
  });

  it("v = 1 ft → acsch(v) = acsch(0.3048)", async () => {
    const r = await solveWith("1", "ft", "acsch(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(acschFn(FT_M), 4);
  });
});
