/**
 * Tests for asin() — solver/functions/trig/asin.ts
 *
 * Formula: elementwise(args[0], Math.asin)
 * Input domain: [-1, 1]. Returns radians in [-π/2, π/2] element-wise.
 *
 * Direct-call tests:
 *   - asin(0) → 0
 *   - asin(1) → π/2
 *   - asin(-1) → -π/2
 *   - asin(0.5) → π/6
 *   - asin(√2/2) → π/4
 *   - Row vector → element-wise arcsines
 *   - 2D matrix → element-wise arcsines
 *   - Empty matrix → empty
 *
 * Pipeline tests:
 *   - x = asin(0) → 0
 *   - x = asin(1) → π/2
 *   - x = asin(0.5) → π/6
 *   - Vector via documentEquations → element-wise arcsines
 *   - Inline 2D matrix literal → element-wise arcsines
 *
 * Unit tests:
 *   - asin() receives the SI-converted numeric value of its argument
 *   - Input must be in domain [-1, 1]; unit-bearing variables must have SI value in that range
 *   - v = 0.5 m → SI = 0.5 → asin(0.5) = π/6
 *   - v = 1 ft → SI = 0.3048 → asin(0.3048)
 */

import { describe, it, expect } from "vitest";
import { asin } from "../../functions/trig/asin";
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

describe("asin — direct call: scalars", () => {
  it("asin(0) → 0", async () => {
    const r = await asin([{ "0-0": 0 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });

  it("asin(1) → π/2", async () => {
    const r = await asin([{ "0-0": 1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.PI / 2, 10);
  });

  it("asin(-1) → -π/2", async () => {
    const r = await asin([{ "0-0": -1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-Math.PI / 2, 10);
  });

  it("asin(0.5) → π/6", async () => {
    const r = await asin([{ "0-0": 0.5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.PI / 6, 10);
  });

  it("asin(√2/2) → π/4", async () => {
    const r = await asin([{ "0-0": Math.SQRT2 / 2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.PI / 4, 10);
  });

  it("asin(√3/2) → π/3", async () => {
    const r = await asin([{ "0-0": Math.sqrt(3) / 2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.PI / 3, 10);
  });
});

describe("asin — direct call: vectors", () => {
  it("row vector [0, 0.5, 1] → [0, π/6, π/2]", async () => {
    const mat = { "0-0": 0, "0-1": 0.5, "0-2": 1 };
    const r = await asin([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
    expect(r["0-1"]).toBeCloseTo(Math.PI / 6, 10);
    expect(r["0-2"]).toBeCloseTo(Math.PI / 2, 10);
  });

  it("row vector [-1, -0.5, 0] → [-π/2, -π/6, 0]", async () => {
    const mat = { "0-0": -1, "0-1": -0.5, "0-2": 0 };
    const r = await asin([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-Math.PI / 2, 10);
    expect(r["0-1"]).toBeCloseTo(-Math.PI / 6, 10);
    expect(r["0-2"]).toBeCloseTo(0, 10);
  });
});

describe("asin — direct call: 2D matrix", () => {
  it("2x2 matrix → element-wise arcsines", async () => {
    const mat = { "0-0": 0, "0-1": 0.5, "1-0": -0.5, "1-1": 1 };
    const r = await asin([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
    expect(r["0-1"]).toBeCloseTo(Math.PI / 6, 10);
    expect(r["1-0"]).toBeCloseTo(-Math.PI / 6, 10);
    expect(r["1-1"]).toBeCloseTo(Math.PI / 2, 10);
  });
});

describe("asin — direct call: edge cases", () => {
  it("empty matrix → empty result", async () => {
    const r = await asin([{}], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(0);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("asin — pipeline: scalars", () => {
  it("x = asin(0) → 0", async () => {
    const r = await runPipeline(ctx("x = asin(0)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });

  it("x = asin(1) → π/2", async () => {
    const r = await runPipeline(ctx("x = asin(1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.PI / 2, 4);
  });

  it("x = asin(0.5) → π/6", async () => {
    const r = await runPipeline(ctx("x = asin(0.5)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.PI / 6, 4);
  });

  it("x = asin(-0.5) → -π/6", async () => {
    const r = await runPipeline(ctx("x = asin(-0.5)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(-Math.PI / 6, 4);
  });
});

describe("asin — pipeline: vector via documentEquations", () => {
  it("asin(v) on [0, 0.5, 1] → [0, π/6, π/2]", async () => {
    const vals = [0, 0.5, 1];
    const expected = [0, Math.PI / 6, Math.PI / 2];
    const c = ctx("y = asin(v)");
    c.documentEquations = [makeVec("v", vals, -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expected.forEach((v, i) => {
      expect(r.solution.real[`0-${i}`]).toBeCloseTo(v, 4);
    });
  });
});

describe("asin — pipeline: inline 2D matrix", () => {
  it("asin([0,0.5;-0.5,1]) → element-wise arcsines", async () => {
    const r = await runPipeline(ctx("y = asin([0,0.5;-0.5,1])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(Math.PI / 6, 4);
    expect(r.solution.real["1-0"]).toBeCloseTo(-Math.PI / 6, 4);
    expect(r.solution.real["1-1"]).toBeCloseTo(Math.PI / 2, 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────
// asin() receives the SI-converted numeric value. Input must be in [-1, 1].
// Result is numerically in radians (dimensionless).

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

describe("asin — simple units (m): uses SI value", () => {
  it("v = 0.5 m → asin(v) = π/6", async () => {
    const r = await solveWith("0.5", "m", "asin(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(Math.PI / 6, 4);
  });

  it("v = 0 m → asin(v) = 0", async () => {
    const r = await solveWith("0", "m", "asin(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(0, 4);
  });
});

describe("asin — converted units (ft): uses SI numeric value", () => {
  it("asin(1ft) → asin(0.3048)", async () => {
    const r = await runPipeline(ctx("x = asin(1ft)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.asin(FT_M), 4);
  });

  it("v = 1 ft → asin(v) = asin(0.3048)", async () => {
    const r = await solveWith("1", "ft", "asin(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(Math.asin(FT_M), 4);
  });
});
