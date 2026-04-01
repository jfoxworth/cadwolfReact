/**
 * Tests for atan() — solver/functions/trig/atan.ts
 *
 * Formula: elementwise(args[0], Math.atan)
 * Input domain: all reals. Returns radians in (-π/2, π/2) element-wise.
 *
 * Direct-call tests:
 *   - atan(0) → 0
 *   - atan(1) → π/4
 *   - atan(-1) → -π/4
 *   - atan(1/√3) → π/6
 *   - atan(√3) → π/3
 *   - Row vector → element-wise arctangents
 *   - 2D matrix → element-wise arctangents
 *   - Empty matrix → empty
 *
 * Pipeline tests:
 *   - x = atan(0) → 0
 *   - x = atan(1) → π/4
 *   - x = atan(-1) → -π/4
 *   - Vector via documentEquations → element-wise arctangents
 *   - Inline 2D matrix literal → element-wise arctangents
 *
 * Unit tests:
 *   - atan() receives the SI-converted numeric value of its argument
 *   - v = 1 m → SI = 1 → atan(1) = π/4
 *   - v = 1 ft → SI = 0.3048 → atan(0.3048)
 *   - v = 1 m/s → SI = 1 → atan(1) = π/4
 */

import { describe, it, expect } from "vitest";
import { atan } from "../../functions/trig/atan";
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

describe("atan — direct call: scalars", () => {
  it("atan(0) → 0", async () => {
    const r = await atan([{ "0-0": 0 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });

  it("atan(1) → π/4", async () => {
    const r = await atan([{ "0-0": 1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.PI / 4, 10);
  });

  it("atan(-1) → -π/4", async () => {
    const r = await atan([{ "0-0": -1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-Math.PI / 4, 10);
  });

  it("atan(1/√3) → π/6", async () => {
    const r = await atan([{ "0-0": 1 / Math.sqrt(3) }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.PI / 6, 10);
  });

  it("atan(√3) → π/3", async () => {
    const r = await atan([{ "0-0": Math.sqrt(3) }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.PI / 3, 10);
  });

  it("atan(large positive) → approaches π/2", async () => {
    const r = await atan([{ "0-0": 1e10 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.PI / 2, 4);
  });
});

describe("atan — direct call: vectors", () => {
  it("row vector [0, 1, -1] → [0, π/4, -π/4]", async () => {
    const mat = { "0-0": 0, "0-1": 1, "0-2": -1 };
    const r = await atan([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
    expect(r["0-1"]).toBeCloseTo(Math.PI / 4, 10);
    expect(r["0-2"]).toBeCloseTo(-Math.PI / 4, 10);
  });
});

describe("atan — direct call: 2D matrix", () => {
  it("2x2 matrix → element-wise arctangents", async () => {
    const mat = { "0-0": 0, "0-1": 1, "1-0": -1, "1-1": Math.sqrt(3) };
    const r = await atan([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
    expect(r["0-1"]).toBeCloseTo(Math.PI / 4, 10);
    expect(r["1-0"]).toBeCloseTo(-Math.PI / 4, 10);
    expect(r["1-1"]).toBeCloseTo(Math.PI / 3, 10);
  });
});

describe("atan — direct call: edge cases", () => {
  it("empty matrix → empty result", async () => {
    const r = await atan([{}], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(0);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("atan — pipeline: scalars", () => {
  it("x = atan(0) → 0", async () => {
    const r = await runPipeline(ctx("x = atan(0)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });

  it("x = atan(1) → π/4", async () => {
    const r = await runPipeline(ctx("x = atan(1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.PI / 4, 4);
  });

  it("x = atan(-1) → -π/4", async () => {
    const r = await runPipeline(ctx("x = atan(-1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(-Math.PI / 4, 4);
  });
});

describe("atan — pipeline: vector via documentEquations", () => {
  it("atan(v) on [0, 1, -1, √3] → element-wise arctangents", async () => {
    const vals = [0, 1, -1, Math.sqrt(3)];
    const expected = [0, Math.PI / 4, -Math.PI / 4, Math.PI / 3];
    const c = ctx("y = atan(v)");
    c.documentEquations = [makeVec("v", vals, -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expected.forEach((v, i) => {
      expect(r.solution.real[`0-${i}`]).toBeCloseTo(v, 4);
    });
  });
});

describe("atan — pipeline: inline 2D matrix", () => {
  it("atan([0,1;-1,1.7320508]) → element-wise arctangents", async () => {
    const r = await runPipeline(ctx("y = atan([0,1;-1,1.7320508])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(Math.PI / 4, 4);
    expect(r.solution.real["1-0"]).toBeCloseTo(-Math.PI / 4, 4);
    expect(r.solution.real["1-1"]).toBeCloseTo(Math.PI / 3, 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────
// atan() receives the SI-converted numeric value of its argument.
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

describe("atan — simple units (m): uses SI value", () => {
  it("v = 1 m → atan(v) = π/4", async () => {
    const r = await solveWith("1", "m", "atan(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(Math.PI / 4, 4);
  });

  it("v = 0 m → atan(v) = 0", async () => {
    const r = await solveWith("0", "m", "atan(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(0, 4);
  });
});

describe("atan — compound units (m/s): uses SI value", () => {
  it("v = 1 m/s → atan(v) = π/4", async () => {
    const r = await solveWith("1", "m/s", "atan(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(Math.PI / 4, 4);
  });
});

describe("atan — converted units (ft): uses SI numeric value", () => {
  it("atan(1ft) → atan(0.3048)", async () => {
    const r = await runPipeline(ctx("x = atan(1ft)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.atan(FT_M), 4);
  });

  it("v = 1 ft → atan(v) = atan(0.3048)", async () => {
    const r = await solveWith("1", "ft", "atan(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(Math.atan(FT_M), 4);
  });
});
