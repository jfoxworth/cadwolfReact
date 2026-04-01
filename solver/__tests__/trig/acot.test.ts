/**
 * Tests for acot() — solver/functions/trig/acot.ts
 *
 * Formula: elementwise(args[0], v => Math.atan(1 / v))
 * Input domain: all nonzero reals. Returns values in (-π/2, π/2) \ {0} element-wise.
 * Inverse cotangent: acot(x) = atan(1/x).
 *
 * Direct-call tests:
 *   - acot(1) → π/4
 *   - acot(-1) → -π/4
 *   - acot(√3) → π/6
 *   - acot(1/√3) → π/3
 *   - Row vector → element-wise results
 *   - 2D matrix → element-wise results
 *   - Empty matrix → empty
 *
 * Pipeline tests:
 *   - x = acot(1) → π/4
 *   - x = acot(-1) → -π/4
 *   - x = acot(1.7320508) → π/6
 *   - Vector via documentEquations → element-wise results
 *   - Inline 2D matrix literal → element-wise results
 *
 * Unit tests:
 *   - acot() receives the SI-converted numeric value of its argument
 *   - v = 1 m → SI = 1 → acot(1) = π/4
 *   - v = 1 ft → SI = 0.3048 → acot(0.3048) = atan(1/0.3048)
 */

import { describe, it, expect } from "vitest";
import { acot } from "../../functions/trig/acot";
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

describe("acot — direct call: scalars", () => {
  it("acot(1) → π/4", async () => {
    const r = await acot([{ "0-0": 1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.PI / 4, 10);
  });

  it("acot(-1) → -π/4", async () => {
    const r = await acot([{ "0-0": -1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-Math.PI / 4, 10);
  });

  it("acot(√3) → π/6", async () => {
    const r = await acot([{ "0-0": Math.sqrt(3) }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.PI / 6, 10);
  });

  it("acot(1/√3) → π/3", async () => {
    const r = await acot([{ "0-0": 1 / Math.sqrt(3) }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.PI / 3, 10);
  });

  it("acot(large positive) → approaches 0", async () => {
    const r = await acot([{ "0-0": 1e10 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 4);
  });
});

describe("acot — direct call: vectors", () => {
  it("row vector [1, -1, √3] → [π/4, -π/4, π/6]", async () => {
    const mat = { "0-0": 1, "0-1": -1, "0-2": Math.sqrt(3) };
    const r = await acot([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.PI / 4, 10);
    expect(r["0-1"]).toBeCloseTo(-Math.PI / 4, 10);
    expect(r["0-2"]).toBeCloseTo(Math.PI / 6, 10);
  });
});

describe("acot — direct call: 2D matrix", () => {
  it("2x2 matrix → element-wise results", async () => {
    const mat = { "0-0": 1, "0-1": -1, "1-0": Math.sqrt(3), "1-1": 1 / Math.sqrt(3) };
    const r = await acot([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.PI / 4, 10);
    expect(r["0-1"]).toBeCloseTo(-Math.PI / 4, 10);
    expect(r["1-0"]).toBeCloseTo(Math.PI / 6, 10);
    expect(r["1-1"]).toBeCloseTo(Math.PI / 3, 10);
  });
});

describe("acot — direct call: edge cases", () => {
  it("empty matrix → empty result", async () => {
    const r = await acot([{}], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(0);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("acot — pipeline: scalars", () => {
  it("x = acot(1) → π/4", async () => {
    const r = await runPipeline(ctx("x = acot(1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.PI / 4, 4);
  });

  it("x = acot(-1) → -π/4", async () => {
    const r = await runPipeline(ctx("x = acot(-1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(-Math.PI / 4, 4);
  });

  it("x = acot(1.7320508) → π/6", async () => {
    const r = await runPipeline(ctx("x = acot(1.7320508)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.PI / 6, 4);
  });
});

describe("acot — pipeline: vector via documentEquations", () => {
  it("acot(v) on [1, -1, √3, 1/√3] → element-wise results", async () => {
    const vals = [1, -1, Math.sqrt(3), 1 / Math.sqrt(3)];
    const expected = [Math.PI / 4, -Math.PI / 4, Math.PI / 6, Math.PI / 3];
    const c = ctx("y = acot(v)");
    c.documentEquations = [makeVec("v", vals, -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expected.forEach((v, i) => {
      expect(r.solution.real[`0-${i}`]).toBeCloseTo(v, 4);
    });
  });
});

describe("acot — pipeline: inline 2D matrix", () => {
  it("acot([1,-1;1.7320508,0.5773503]) → element-wise results", async () => {
    const r = await runPipeline(ctx("y = acot([1,-1;1.7320508,0.5773503])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.PI / 4, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(-Math.PI / 4, 4);
    expect(r.solution.real["1-0"]).toBeCloseTo(Math.PI / 6, 4);
    expect(r.solution.real["1-1"]).toBeCloseTo(Math.PI / 3, 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────
// acot() receives the SI-converted numeric value of its argument.

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

describe("acot — simple units (m): uses SI value", () => {
  it("v = 1 m → acot(v) = π/4", async () => {
    const r = await solveWith("1", "m", "acot(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(Math.PI / 4, 4);
  });

  it("v = -1 m → acot(v) = -π/4", async () => {
    const r = await solveWith("-1", "m", "acot(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(-Math.PI / 4, 4);
  });
});

describe("acot — converted units (ft): uses SI numeric value", () => {
  it("acot(1ft) → acot(0.3048) = atan(1/0.3048)", async () => {
    const r = await runPipeline(ctx("x = acot(1ft)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.atan(1 / FT_M), 4);
  });

  it("v = 1 ft → acot(v) = atan(1/0.3048)", async () => {
    const r = await solveWith("1", "ft", "acot(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(Math.atan(1 / FT_M), 4);
  });
});
