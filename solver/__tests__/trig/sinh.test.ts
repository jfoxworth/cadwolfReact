/**
 * Tests for sinh() — solver/functions/trig/sinh.ts
 *
 * Formula: elementwise(args[0], Math.sinh)
 * Input domain: all reals. Returns dimensionless result element-wise.
 * sinh(x) = (e^x - e^(-x)) / 2
 *
 * Direct-call tests:
 *   - sinh(0) → 0
 *   - sinh(1) → 1.1752
 *   - sinh(-1) → -1.1752
 *   - sinh(2) → 3.6269
 *   - Row vector → element-wise hyperbolic sines
 *   - 2D matrix → element-wise hyperbolic sines
 *   - Empty matrix → empty
 *
 * Pipeline tests:
 *   - x = sinh(0) → 0
 *   - x = sinh(1) → 1.1752
 *   - x = sinh(-1) → -1.1752
 *   - Vector via documentEquations → element-wise hyperbolic sines
 *   - Inline 2D matrix literal → element-wise hyperbolic sines
 *
 * Unit tests:
 *   - sinh() receives the SI-converted numeric value of its argument
 *   - v = 1 m → SI = 1 → sinh(1)
 *   - v = 1 ft → SI = 0.3048 → sinh(0.3048)
 */

import { describe, it, expect } from "vitest";
import { sinh } from "../../functions/trig/sinh";
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

describe("sinh — direct call: scalars", () => {
  it("sinh(0) → 0", async () => {
    const r = await sinh([{ "0-0": 0 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });

  it("sinh(1) → 1.1752", async () => {
    const r = await sinh([{ "0-0": 1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.sinh(1), 10);
  });

  it("sinh(-1) → -1.1752 (odd function)", async () => {
    const r = await sinh([{ "0-0": -1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-Math.sinh(1), 10);
  });

  it("sinh(2) → 3.6269", async () => {
    const r = await sinh([{ "0-0": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.sinh(2), 10);
  });

  it("sinh(0.5) → 0.5211", async () => {
    const r = await sinh([{ "0-0": 0.5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.sinh(0.5), 10);
  });
});

describe("sinh — direct call: vectors", () => {
  it("row vector [0, 1, -1] → [0, sinh(1), -sinh(1)]", async () => {
    const mat = { "0-0": 0, "0-1": 1, "0-2": -1 };
    const r = await sinh([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
    expect(r["0-1"]).toBeCloseTo(Math.sinh(1), 10);
    expect(r["0-2"]).toBeCloseTo(-Math.sinh(1), 10);
  });
});

describe("sinh — direct call: 2D matrix", () => {
  it("2x2 matrix → element-wise hyperbolic sines", async () => {
    const mat = { "0-0": 0, "0-1": 1, "1-0": -1, "1-1": 2 };
    const r = await sinh([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
    expect(r["0-1"]).toBeCloseTo(Math.sinh(1), 10);
    expect(r["1-0"]).toBeCloseTo(Math.sinh(-1), 10);
    expect(r["1-1"]).toBeCloseTo(Math.sinh(2), 10);
  });
});

describe("sinh — direct call: edge cases", () => {
  it("empty matrix → empty result", async () => {
    const r = await sinh([{}], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(0);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("sinh — pipeline: scalars", () => {
  it("x = sinh(0) → 0", async () => {
    const r = await runPipeline(ctx("x = sinh(0)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });

  it("x = sinh(1) → 1.1752", async () => {
    const r = await runPipeline(ctx("x = sinh(1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.sinh(1), 4);
  });

  it("x = sinh(-1) → -1.1752", async () => {
    const r = await runPipeline(ctx("x = sinh(-1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(-Math.sinh(1), 4);
  });
});

describe("sinh — pipeline: vector via documentEquations", () => {
  it("sinh(v) on [0, 1, -1, 2] → element-wise hyperbolic sines", async () => {
    const vals = [0, 1, -1, 2];
    const c = ctx("y = sinh(v)");
    c.documentEquations = [makeVec("v", vals, -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    vals.forEach((v, i) => {
      expect(r.solution.real[`0-${i}`]).toBeCloseTo(Math.sinh(v), 4);
    });
  });
});

describe("sinh — pipeline: inline 2D matrix", () => {
  it("sinh([0,1;-1,2]) → element-wise hyperbolic sines", async () => {
    const r = await runPipeline(ctx("y = sinh([0,1;-1,2])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(Math.sinh(1), 4);
    expect(r.solution.real["1-0"]).toBeCloseTo(Math.sinh(-1), 4);
    expect(r.solution.real["1-1"]).toBeCloseTo(Math.sinh(2), 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────
// sinh() receives the SI-converted numeric value of its argument.

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

describe("sinh — simple units (m): uses SI value", () => {
  it("v = 1 m → sinh(v) = sinh(1)", async () => {
    const r = await solveWith("1", "m", "sinh(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(Math.sinh(1), 4);
  });

  it("v = 0 m → sinh(v) = 0", async () => {
    const r = await solveWith("0", "m", "sinh(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(0, 4);
  });
});

describe("sinh — converted units (ft): uses SI numeric value", () => {
  it("sinh(1ft) → sinh(0.3048)", async () => {
    const r = await runPipeline(ctx("x = sinh(1ft)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.sinh(FT_M), 4);
  });

  it("v = 1 ft → sinh(v) = sinh(0.3048)", async () => {
    const r = await solveWith("1", "ft", "sinh(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(Math.sinh(FT_M), 4);
  });
});
