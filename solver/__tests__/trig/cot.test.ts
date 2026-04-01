/**
 * Tests for cot() — solver/functions/trig/cot.ts
 *
 * Formula: elementwise(args[0], v => 1 / Math.tan(v))
 * Input is treated as radians. Returns dimensionless result element-wise.
 * Undefined at 0, π, 2π, ... (where tan = 0).
 *
 * Direct-call tests:
 *   - cot(π/4) → 1
 *   - cot(π/6) → √3
 *   - cot(π/3) → 1/√3
 *   - cot(π/2) → ≈0
 *   - cot(-π/4) → -1
 *   - Row vector → element-wise cotangents
 *   - 2D matrix → element-wise cotangents
 *   - Empty matrix → empty
 *
 * Pipeline tests:
 *   - x = cot(0.7853982) → 1 (cot(π/4))
 *   - x = cot(1.5707963) → ≈0 (cot(π/2))
 *   - Vector via documentEquations → element-wise cotangents
 *   - Inline 2D matrix literal → element-wise cotangents
 *
 * Unit tests:
 *   - cot() operates on the SI-converted numeric value of its argument
 *   - cot(45 deg) → 1
 *   - cot(90 deg) → ≈0
 *   - cot(v) where v stored in deg → uses SI radian value
 *   - cot(1 ft) → cot(0.3048)
 */

import { describe, it, expect } from "vitest";
import { cot } from "../../functions/trig/cot";
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

describe("cot — direct call: scalars", () => {
  it("cot(π/4) → 1", async () => {
    const r = await cot([{ "0-0": Math.PI / 4 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
  });

  it("cot(π/6) → √3", async () => {
    const r = await cot([{ "0-0": Math.PI / 6 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.sqrt(3), 10);
  });

  it("cot(π/3) → 1/√3", async () => {
    const r = await cot([{ "0-0": Math.PI / 3 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1 / Math.sqrt(3), 10);
  });

  it("cot(π/2) → ≈0", async () => {
    const r = await cot([{ "0-0": Math.PI / 2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 5);
  });

  it("cot(-π/4) → -1", async () => {
    const r = await cot([{ "0-0": -Math.PI / 4 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-1, 10);
  });
});

describe("cot — direct call: vectors", () => {
  it("row vector [π/4, π/6, π/3] → [1, √3, 1/√3]", async () => {
    const mat = { "0-0": Math.PI / 4, "0-1": Math.PI / 6, "0-2": Math.PI / 3 };
    const r = await cot([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
    expect(r["0-1"]).toBeCloseTo(Math.sqrt(3), 10);
    expect(r["0-2"]).toBeCloseTo(1 / Math.sqrt(3), 10);
  });
});

describe("cot — direct call: 2D matrix", () => {
  it("2x2 matrix → element-wise cotangents", async () => {
    const mat = { "0-0": Math.PI / 4, "0-1": Math.PI / 6, "1-0": -Math.PI / 4, "1-1": Math.PI / 3 };
    const r = await cot([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
    expect(r["0-1"]).toBeCloseTo(Math.sqrt(3), 10);
    expect(r["1-0"]).toBeCloseTo(-1, 10);
    expect(r["1-1"]).toBeCloseTo(1 / Math.sqrt(3), 10);
  });
});

describe("cot — direct call: edge cases", () => {
  it("empty matrix → empty result", async () => {
    const r = await cot([{}], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(0);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("cot — pipeline: scalars", () => {
  it("x = cot(0.7853982) → 1 (cot(π/4))", async () => {
    const r = await runPipeline(ctx("x = cot(0.7853982)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
  });

  it("x = cot(1.5707963) → ≈0 (cot(π/2))", async () => {
    const r = await runPipeline(ctx("x = cot(1.5707963)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });
});

describe("cot — pipeline: vector via documentEquations", () => {
  it("cot(v) on [π/4, π/6, π/3] → [1, √3, 1/√3]", async () => {
    const vals = [Math.PI / 4, Math.PI / 6, Math.PI / 3];
    const expected = [1, Math.sqrt(3), 1 / Math.sqrt(3)];
    const c = ctx("y = cot(v)");
    c.documentEquations = [makeVec("v", vals, -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expected.forEach((v, i) => {
      expect(r.solution.real[`0-${i}`]).toBeCloseTo(v, 4);
    });
  });
});

describe("cot — pipeline: inline 2D matrix", () => {
  it("cot([0.7853982,0.5235988;-0.7853982,1.0471976]) → element-wise cotangents", async () => {
    const r = await runPipeline(ctx("y = cot([0.7853982,0.5235988;-0.7853982,1.0471976])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(Math.sqrt(3), 4);
    expect(r.solution.real["1-0"]).toBeCloseTo(-1, 4);
    expect(r.solution.real["1-1"]).toBeCloseTo(1 / Math.sqrt(3), 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────
// cot() receives the SI-converted numeric value of its argument.
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

describe("cot — degree unit (inline): deg converts to radians", () => {
  it("cot(45deg) → 1", async () => {
    const r = await runPipeline(ctx("x = cot(45deg)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
  });

  it("cot(90deg) → ≈0", async () => {
    const r = await runPipeline(ctx("x = cot(90deg)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });
});

describe("cot — degree unit (via variable)", () => {
  it("v = 45 deg → cot(v) = 1", async () => {
    const r = await solveWith("45", "deg", "cot(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(1, 4);
  });
});

describe("cot — converted units (ft): uses SI numeric value", () => {
  it("cot(1 ft) → cot(0.3048)", async () => {
    const r = await runPipeline(ctx("x = cot(1ft)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1 / Math.tan(FT_M), 4);
  });
});
