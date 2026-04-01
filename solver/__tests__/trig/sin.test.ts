/**
 * Tests for sin() — solver/functions/trig/sin.ts
 *
 * Formula: elementwise(args[0], Math.sin)
 * Input is treated as radians. Returns dimensionless result element-wise.
 *
 * Direct-call tests:
 *   - sin(0) → 0
 *   - sin(π/2) → 1
 *   - sin(π) → ≈0
 *   - sin(-π/2) → -1
 *   - sin(π/6) → 0.5
 *   - Row vector [0, π/2, π] → element-wise sines
 *   - 2x2 matrix → element-wise sines
 *   - Empty matrix → empty
 *
 * Pipeline tests:
 *   - x = sin(0) → 0
 *   - x = sin(1.5707963) → 1
 *   - x = sin(0.5235988) → 0.5
 *   - Vector via documentEquations → element-wise sines
 *   - Inline 2D matrix literal → element-wise sines
 *
 * Unit tests:
 *   - sin() operates on the SI-converted numeric value of its argument
 *   - sin(30 deg) → 0.5  (deg converts to radians: 30 × π/180)
 *   - sin(90 deg) → 1
 *   - sin(v) where v is stored in deg → uses SI radian value
 *   - sin(1 ft) → sin(0.3048)  (ft converts to SI metres numerically)
 */

import { describe, it, expect } from "vitest";
import { sin } from "../../functions/trig/sin";
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

describe("sin — direct call: scalars", () => {
  it("sin(0) → 0", async () => {
    const r = await sin([{ "0-0": 0 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });

  it("sin(π/2) → 1", async () => {
    const r = await sin([{ "0-0": Math.PI / 2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
  });

  it("sin(π) → ≈0", async () => {
    const r = await sin([{ "0-0": Math.PI }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });

  it("sin(-π/2) → -1", async () => {
    const r = await sin([{ "0-0": -Math.PI / 2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-1, 10);
  });

  it("sin(π/6) → 0.5", async () => {
    const r = await sin([{ "0-0": Math.PI / 6 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0.5, 10);
  });

  it("sin(π/4) → √2/2", async () => {
    const r = await sin([{ "0-0": Math.PI / 4 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.SQRT2 / 2, 10);
  });
});

describe("sin — direct call: vectors", () => {
  it("row vector [0, π/2, π] → [0, 1, ≈0]", async () => {
    const mat = { "0-0": 0, "0-1": Math.PI / 2, "0-2": Math.PI };
    const r = await sin([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
    expect(r["0-1"]).toBeCloseTo(1, 10);
    expect(r["0-2"]).toBeCloseTo(0, 10);
  });

  it("row vector [π/6, π/4, π/3] → [0.5, √2/2, √3/2]", async () => {
    const mat = { "0-0": Math.PI / 6, "0-1": Math.PI / 4, "0-2": Math.PI / 3 };
    const r = await sin([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0.5, 10);
    expect(r["0-1"]).toBeCloseTo(Math.SQRT2 / 2, 10);
    expect(r["0-2"]).toBeCloseTo(Math.sqrt(3) / 2, 10);
  });
});

describe("sin — direct call: 2D matrix", () => {
  it("2x2 matrix → element-wise sines", async () => {
    const mat = { "0-0": 0, "0-1": Math.PI / 2, "1-0": Math.PI, "1-1": -Math.PI / 2 };
    const r = await sin([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
    expect(r["0-1"]).toBeCloseTo(1, 10);
    expect(r["1-0"]).toBeCloseTo(0, 10);
    expect(r["1-1"]).toBeCloseTo(-1, 10);
  });
});

describe("sin — direct call: edge cases", () => {
  it("empty matrix → empty result", async () => {
    const r = await sin([{}], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(0);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("sin — pipeline: scalars", () => {
  it("x = sin(0) → 0", async () => {
    const r = await runPipeline(ctx("x = sin(0)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });

  it("x = sin(1.5707963) → 1", async () => {
    const r = await runPipeline(ctx("x = sin(1.5707963)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
  });

  it("x = sin(0.5235988) → 0.5", async () => {
    const r = await runPipeline(ctx("x = sin(0.5235988)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0.5, 4);
  });
});

describe("sin — pipeline: vector via documentEquations", () => {
  it("sin(v) on [0, π/6, π/4, π/3, π/2] → element-wise sines", async () => {
    const vals = [0, Math.PI / 6, Math.PI / 4, Math.PI / 3, Math.PI / 2];
    const expected = [0, 0.5, Math.SQRT2 / 2, Math.sqrt(3) / 2, 1];
    const c = ctx("y = sin(v)");
    c.documentEquations = [makeVec("v", vals, -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expected.forEach((v, i) => {
      expect(r.solution.real[`0-${i}`]).toBeCloseTo(v, 4);
    });
  });
});

describe("sin — pipeline: inline 2D matrix", () => {
  it("sin([0,1.5707963;3.1415927,-1.5707963]) → element-wise sines", async () => {
    const r = await runPipeline(ctx("y = sin([0,1.5707963;3.1415927,-1.5707963])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(1, 4);
    expect(r.solution.real["1-0"]).toBeCloseTo(0, 4);
    expect(r.solution.real["1-1"]).toBeCloseTo(-1, 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────
// sin() receives the SI-converted numeric value of its argument.
// deg → radians (multiply by π/180). Result is dimensionless.

const DEG_RAD = Math.PI / 180;
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

describe("sin — degree unit (inline): deg converts to radians", () => {
  it("sin(0deg) → 0", async () => {
    const r = await runPipeline(ctx("x = sin(0deg)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });

  it("sin(30deg) → 0.5", async () => {
    const r = await runPipeline(ctx("x = sin(30deg)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0.5, 4);
  });

  it("sin(45deg) → √2/2", async () => {
    const r = await runPipeline(ctx("x = sin(45deg)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.SQRT2 / 2, 4);
  });

  it("sin(90deg) → 1", async () => {
    const r = await runPipeline(ctx("x = sin(90deg)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
  });

  it("sin(180deg) → ≈0", async () => {
    const r = await runPipeline(ctx("x = sin(180deg)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });
});

describe("sin — degree unit (via variable)", () => {
  it("v = 30 deg → sin(v) = 0.5", async () => {
    const r = await solveWith("30", "deg", "sin(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(0.5, 4);
  });

  it("v = 90 deg → sin(v) = 1", async () => {
    const r = await solveWith("90", "deg", "sin(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(1, 4);
  });
});

describe("sin — converted units (ft): uses SI numeric value", () => {
  it("sin(1 ft) → sin(0.3048)", async () => {
    const r = await runPipeline(ctx("x = sin(1ft)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.sin(FT_M), 4);
  });

  it("v = 1 ft → sin(v) = sin(0.3048)", async () => {
    const r = await solveWith("1", "ft", "sin(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(Math.sin(FT_M), 4);
  });
});
