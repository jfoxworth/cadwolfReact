/**
 * Tests for tan() — solver/functions/trig/tan.ts
 *
 * Formula: elementwise(args[0], Math.tan)
 * Input is treated as radians. Returns dimensionless result element-wise.
 *
 * Direct-call tests:
 *   - tan(0) → 0
 *   - tan(π/4) → 1
 *   - tan(-π/4) → -1
 *   - tan(π/6) → 1/√3
 *   - Row vector → element-wise tangents
 *   - 2D matrix → element-wise tangents
 *   - Empty matrix → empty
 *
 * Pipeline tests:
 *   - x = tan(0) → 0
 *   - x = tan(0.7853982) → 1 (tan(π/4))
 *   - x = tan(1) → 1.5574
 *   - Vector via documentEquations → element-wise tangents
 *   - Inline 2D matrix literal → element-wise tangents
 *
 * Unit tests:
 *   - tan() operates on the SI-converted numeric value of its argument
 *   - tan(0 deg) → 0
 *   - tan(45 deg) → 1
 *   - tan(v) where v stored in deg → uses SI radian value
 *   - tan(1 ft) → tan(0.3048)
 */

import { describe, it, expect } from "vitest";
import { tan } from "../../functions/trig/tan";
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

describe("tan — direct call: scalars", () => {
  it("tan(0) → 0", async () => {
    const r = await tan([{ "0-0": 0 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });

  it("tan(π/4) → 1", async () => {
    const r = await tan([{ "0-0": Math.PI / 4 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
  });

  it("tan(-π/4) → -1", async () => {
    const r = await tan([{ "0-0": -Math.PI / 4 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-1, 10);
  });

  it("tan(π/6) → 1/√3", async () => {
    const r = await tan([{ "0-0": Math.PI / 6 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1 / Math.sqrt(3), 10);
  });

  it("tan(1) → 1.5574", async () => {
    const r = await tan([{ "0-0": 1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.tan(1), 10);
  });
});

describe("tan — direct call: vectors", () => {
  it("row vector [0, π/6, π/4] → element-wise tangents", async () => {
    const mat = { "0-0": 0, "0-1": Math.PI / 6, "0-2": Math.PI / 4 };
    const r = await tan([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
    expect(r["0-1"]).toBeCloseTo(1 / Math.sqrt(3), 10);
    expect(r["0-2"]).toBeCloseTo(1, 10);
  });
});

describe("tan — direct call: 2D matrix", () => {
  it("2x2 matrix → element-wise tangents", async () => {
    const mat = { "0-0": 0, "0-1": Math.PI / 4, "1-0": Math.PI / 6, "1-1": -Math.PI / 4 };
    const r = await tan([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
    expect(r["0-1"]).toBeCloseTo(1, 10);
    expect(r["1-0"]).toBeCloseTo(1 / Math.sqrt(3), 10);
    expect(r["1-1"]).toBeCloseTo(-1, 10);
  });
});

describe("tan — direct call: edge cases", () => {
  it("empty matrix → empty result", async () => {
    const r = await tan([{}], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(0);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("tan — pipeline: scalars", () => {
  it("x = tan(0) → 0", async () => {
    const r = await runPipeline(ctx("x = tan(0)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });

  it("x = tan(0.7853982) → 1 (tan(π/4))", async () => {
    const r = await runPipeline(ctx("x = tan(0.7853982)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
  });

  it("x = tan(1) → 1.5574", async () => {
    const r = await runPipeline(ctx("x = tan(1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.tan(1), 4);
  });
});

describe("tan — pipeline: vector via documentEquations", () => {
  it("tan(v) on [0, 0.5, 1.0] → element-wise tangents", async () => {
    const vals = [0, 0.5, 1.0];
    const c = ctx("y = tan(v)");
    c.documentEquations = [makeVec("v", vals, -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    vals.forEach((v, i) => {
      expect(r.solution.real[`0-${i}`]).toBeCloseTo(Math.tan(v), 4);
    });
  });
});

describe("tan — pipeline: inline 2D matrix", () => {
  it("tan([0,0.7853982;0.5235988,-0.7853982]) → element-wise tangents", async () => {
    const r = await runPipeline(ctx("y = tan([0,0.7853982;0.5235988,-0.7853982])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(1, 4);
    expect(r.solution.real["1-0"]).toBeCloseTo(1 / Math.sqrt(3), 4);
    expect(r.solution.real["1-1"]).toBeCloseTo(-1, 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────
// tan() receives the SI-converted numeric value of its argument.
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

describe("tan — degree unit (inline): deg converts to radians", () => {
  it("tan(0deg) → 0", async () => {
    const r = await runPipeline(ctx("x = tan(0deg)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });

  it("tan(45deg) → 1", async () => {
    const r = await runPipeline(ctx("x = tan(45deg)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
  });

  it("tan(-45deg) → -1", async () => {
    const r = await runPipeline(ctx("x = tan(-45deg)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(-1, 4);
  });
});

describe("tan — degree unit (via variable)", () => {
  it("v = 45 deg → tan(v) = 1", async () => {
    const r = await solveWith("45", "deg", "tan(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(1, 4);
  });

  it("v = 0 deg → tan(v) = 0", async () => {
    const r = await solveWith("0", "deg", "tan(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(0, 4);
  });
});

describe("tan — converted units (ft): uses SI numeric value", () => {
  it("tan(1 ft) → tan(0.3048)", async () => {
    const r = await runPipeline(ctx("x = tan(1ft)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.tan(FT_M), 4);
  });
});
