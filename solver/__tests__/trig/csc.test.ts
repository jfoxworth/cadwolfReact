/**
 * Tests for csc() — solver/functions/trig/csc.ts
 *
 * Formula: elementwise(args[0], v => 1 / Math.sin(v))
 * Input is treated as radians. Returns dimensionless result element-wise.
 * Undefined at 0, π, 2π, ... (where sin = 0).
 *
 * Direct-call tests:
 *   - csc(π/2) → 1
 *   - csc(π/6) → 2
 *   - csc(-π/2) → -1
 *   - csc(π/4) → √2
 *   - Row vector → element-wise cosecants
 *   - 2D matrix → element-wise cosecants
 *   - Empty matrix → empty
 *
 * Pipeline tests:
 *   - x = csc(1.5707963) → 1 (csc(π/2))
 *   - x = csc(0.5235988) → 2 (csc(π/6))
 *   - Vector via documentEquations → element-wise cosecants
 *   - Inline 2D matrix literal → element-wise cosecants
 *
 * Unit tests:
 *   - csc() operates on the SI-converted numeric value of its argument
 *   - csc(90 deg) → 1
 *   - csc(30 deg) → 2
 *   - csc(v) where v stored in deg → uses SI radian value
 *   - csc(1 ft) → csc(0.3048)
 */

import { describe, it, expect } from "vitest";
import { csc } from "../../functions/trig/csc";
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

describe("csc — direct call: scalars", () => {
  it("csc(π/2) → 1", async () => {
    const r = await csc([{ "0-0": Math.PI / 2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
  });

  it("csc(π/6) → 2", async () => {
    const r = await csc([{ "0-0": Math.PI / 6 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(2, 10);
  });

  it("csc(-π/2) → -1", async () => {
    const r = await csc([{ "0-0": -Math.PI / 2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-1, 10);
  });

  it("csc(π/4) → √2", async () => {
    const r = await csc([{ "0-0": Math.PI / 4 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.SQRT2, 10);
  });

  it("csc(π/3) → 2/√3", async () => {
    const r = await csc([{ "0-0": Math.PI / 3 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(2 / Math.sqrt(3), 10);
  });
});

describe("csc — direct call: vectors", () => {
  it("row vector [π/2, π/6, π/4] → [1, 2, √2]", async () => {
    const mat = { "0-0": Math.PI / 2, "0-1": Math.PI / 6, "0-2": Math.PI / 4 };
    const r = await csc([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
    expect(r["0-1"]).toBeCloseTo(2, 10);
    expect(r["0-2"]).toBeCloseTo(Math.SQRT2, 10);
  });
});

describe("csc — direct call: 2D matrix", () => {
  it("2x2 matrix → element-wise cosecants", async () => {
    const mat = { "0-0": Math.PI / 2, "0-1": Math.PI / 6, "1-0": -Math.PI / 2, "1-1": Math.PI / 4 };
    const r = await csc([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
    expect(r["0-1"]).toBeCloseTo(2, 10);
    expect(r["1-0"]).toBeCloseTo(-1, 10);
    expect(r["1-1"]).toBeCloseTo(Math.SQRT2, 10);
  });
});

describe("csc — direct call: edge cases", () => {
  it("empty matrix → empty result", async () => {
    const r = await csc([{}], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(0);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("csc — pipeline: scalars", () => {
  it("x = csc(1.5707963) → 1 (csc(π/2))", async () => {
    const r = await runPipeline(ctx("x = csc(1.5707963)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
  });

  it("x = csc(0.5235988) → 2 (csc(π/6))", async () => {
    const r = await runPipeline(ctx("x = csc(0.5235988)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(2, 4);
  });
});

describe("csc — pipeline: vector via documentEquations", () => {
  it("csc(v) on [π/2, π/6, π/4] → [1, 2, √2]", async () => {
    const vals = [Math.PI / 2, Math.PI / 6, Math.PI / 4];
    const expected = [1, 2, Math.SQRT2];
    const c = ctx("y = csc(v)");
    c.documentEquations = [makeVec("v", vals, -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expected.forEach((v, i) => {
      expect(r.solution.real[`0-${i}`]).toBeCloseTo(v, 4);
    });
  });
});

describe("csc — pipeline: inline 2D matrix", () => {
  it("csc([1.5707963,0.5235988;-1.5707963,0.7853982]) → element-wise cosecants", async () => {
    const r = await runPipeline(ctx("y = csc([1.5707963,0.5235988;-1.5707963,0.7853982])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(2, 4);
    expect(r.solution.real["1-0"]).toBeCloseTo(-1, 4);
    expect(r.solution.real["1-1"]).toBeCloseTo(Math.SQRT2, 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────
// csc() receives the SI-converted numeric value of its argument.
// deg → radians (multiply by π/180). Result is dimensionless.

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

describe("csc — degree unit (inline): deg converts to radians", () => {
  it("csc(90deg) → 1", async () => {
    const r = await runPipeline(ctx("x = csc(90deg)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
  });

  it("csc(30deg) → 2", async () => {
    const r = await runPipeline(ctx("x = csc(30deg)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(2, 4);
  });
});

describe("csc — degree unit (via variable)", () => {
  it("v = 90 deg → csc(v) = 1", async () => {
    const r = await solveWith("90", "deg", "csc(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(1, 4);
  });

  it("v = 30 deg → csc(v) = 2", async () => {
    const r = await solveWith("30", "deg", "csc(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(2, 4);
  });
});

describe("csc — converted units (ft): uses SI numeric value", () => {
  it("csc(1 ft) → csc(0.3048)", async () => {
    const r = await runPipeline(ctx("x = csc(1ft)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1 / Math.sin(FT_M), 4);
  });
});
