/**
 * Tests for acos() — solver/functions/trig/acos.ts
 *
 * Formula: elementwise(args[0], Math.acos)
 * Input domain: [-1, 1]. Returns radians in [0, π] element-wise.
 *
 * Direct-call tests:
 *   - acos(1) → 0
 *   - acos(0) → π/2
 *   - acos(-1) → π
 *   - acos(0.5) → π/3
 *   - acos(√2/2) → π/4
 *   - Row vector → element-wise arccosines
 *   - 2D matrix → element-wise arccosines
 *   - Empty matrix → empty
 *
 * Pipeline tests:
 *   - x = acos(1) → 0
 *   - x = acos(0) → π/2
 *   - x = acos(0.5) → π/3
 *   - Vector via documentEquations → element-wise arccosines
 *   - Inline 2D matrix literal → element-wise arccosines
 *
 * Unit tests:
 *   - acos() receives the SI-converted numeric value of its argument
 *   - v = 0.5 m → SI = 0.5 → acos(0.5) = π/3
 *   - v = 1 ft → SI = 0.3048 → acos(0.3048)
 */

import { describe, it, expect } from "vitest";
import { acos } from "../../functions/trig/acos";
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

describe("acos — direct call: scalars", () => {
  it("acos(1) → 0", async () => {
    const r = await acos([{ "0-0": 1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });

  it("acos(0) → π/2", async () => {
    const r = await acos([{ "0-0": 0 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.PI / 2, 10);
  });

  it("acos(-1) → π", async () => {
    const r = await acos([{ "0-0": -1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.PI, 10);
  });

  it("acos(0.5) → π/3", async () => {
    const r = await acos([{ "0-0": 0.5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.PI / 3, 10);
  });

  it("acos(√2/2) → π/4", async () => {
    const r = await acos([{ "0-0": Math.SQRT2 / 2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.PI / 4, 10);
  });

  it("acos(√3/2) → π/6", async () => {
    const r = await acos([{ "0-0": Math.sqrt(3) / 2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.PI / 6, 10);
  });
});

describe("acos — direct call: vectors", () => {
  it("row vector [1, 0.5, 0] → [0, π/3, π/2]", async () => {
    const mat = { "0-0": 1, "0-1": 0.5, "0-2": 0 };
    const r = await acos([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
    expect(r["0-1"]).toBeCloseTo(Math.PI / 3, 10);
    expect(r["0-2"]).toBeCloseTo(Math.PI / 2, 10);
  });
});

describe("acos — direct call: 2D matrix", () => {
  it("2x2 matrix → element-wise arccosines", async () => {
    const mat = { "0-0": 1, "0-1": 0.5, "1-0": 0, "1-1": -1 };
    const r = await acos([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
    expect(r["0-1"]).toBeCloseTo(Math.PI / 3, 10);
    expect(r["1-0"]).toBeCloseTo(Math.PI / 2, 10);
    expect(r["1-1"]).toBeCloseTo(Math.PI, 10);
  });
});

describe("acos — direct call: edge cases", () => {
  it("empty matrix → empty result", async () => {
    const r = await acos([{}], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(0);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("acos — pipeline: scalars", () => {
  it("x = acos(1) → 0", async () => {
    const r = await runPipeline(ctx("x = acos(1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });

  it("x = acos(0) → π/2", async () => {
    const r = await runPipeline(ctx("x = acos(0)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.PI / 2, 4);
  });

  it("x = acos(0.5) → π/3", async () => {
    const r = await runPipeline(ctx("x = acos(0.5)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.PI / 3, 4);
  });

  it("x = acos(-1) → π", async () => {
    const r = await runPipeline(ctx("x = acos(-1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.PI, 4);
  });
});

describe("acos — pipeline: vector via documentEquations", () => {
  it("acos(v) on [1, 0.5, 0] → [0, π/3, π/2]", async () => {
    const vals = [1, 0.5, 0];
    const expected = [0, Math.PI / 3, Math.PI / 2];
    const c = ctx("y = acos(v)");
    c.documentEquations = [makeVec("v", vals, -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expected.forEach((v, i) => {
      expect(r.solution.real[`0-${i}`]).toBeCloseTo(v, 4);
    });
  });
});

describe("acos — pipeline: inline 2D matrix", () => {
  it("acos([1,0.5;0,-1]) → element-wise arccosines", async () => {
    const r = await runPipeline(ctx("y = acos([1,0.5;0,-1])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(Math.PI / 3, 4);
    expect(r.solution.real["1-0"]).toBeCloseTo(Math.PI / 2, 4);
    expect(r.solution.real["1-1"]).toBeCloseTo(Math.PI, 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────
// acos() receives the SI-converted numeric value. Input must be in [-1, 1].
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

describe("acos — simple units (m): uses SI value", () => {
  it("v = 0.5 m → acos(v) = π/3", async () => {
    const r = await solveWith("0.5", "m", "acos(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(Math.PI / 3, 4);
  });

  it("v = 0 m → acos(v) = π/2", async () => {
    const r = await solveWith("0", "m", "acos(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(Math.PI / 2, 4);
  });
});

describe("acos — converted units (ft): uses SI numeric value", () => {
  it("acos(1ft) → acos(0.3048)", async () => {
    const r = await runPipeline(ctx("x = acos(1ft)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.acos(FT_M), 4);
  });

  it("v = 1 ft → acos(v) = acos(0.3048)", async () => {
    const r = await solveWith("1", "ft", "acos(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(Math.acos(FT_M), 4);
  });
});
