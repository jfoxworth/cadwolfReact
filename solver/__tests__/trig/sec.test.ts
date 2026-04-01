/**
 * Tests for sec() — solver/functions/trig/sec.ts
 *
 * Formula: elementwise(args[0], v => 1 / Math.cos(v))
 * Input is treated as radians. Returns dimensionless result element-wise.
 * Undefined at π/2 + nπ (where cos = 0).
 *
 * Direct-call tests:
 *   - sec(0) → 1
 *   - sec(π/3) → 2
 *   - sec(π) → -1
 *   - sec(2π) → 1
 *   - Row vector → element-wise secants
 *   - 2D matrix → element-wise secants
 *   - Empty matrix → empty
 *
 * Pipeline tests:
 *   - x = sec(0) → 1
 *   - x = sec(1.0471976) → 2 (sec(π/3))
 *   - Vector via documentEquations → element-wise secants
 *   - Inline 2D matrix literal → element-wise secants
 *
 * Unit tests:
 *   - sec() operates on the SI-converted numeric value of its argument
 *   - sec(0 deg) → 1
 *   - sec(60 deg) → 2
 *   - sec(v) where v stored in deg → uses SI radian value
 *   - sec(1 ft) → sec(0.3048)
 */

import { describe, it, expect } from "vitest";
import { sec } from "../../functions/trig/sec";
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

describe("sec — direct call: scalars", () => {
  it("sec(0) → 1", async () => {
    const r = await sec([{ "0-0": 0 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
  });

  it("sec(π/3) → 2", async () => {
    const r = await sec([{ "0-0": Math.PI / 3 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(2, 10);
  });

  it("sec(π) → -1", async () => {
    const r = await sec([{ "0-0": Math.PI }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-1, 10);
  });

  it("sec(2π) → 1", async () => {
    const r = await sec([{ "0-0": 2 * Math.PI }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
  });

  it("sec(π/4) → √2", async () => {
    const r = await sec([{ "0-0": Math.PI / 4 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.SQRT2, 10);
  });
});

describe("sec — direct call: vectors", () => {
  it("row vector [0, π/3, π] → [1, 2, -1]", async () => {
    const mat = { "0-0": 0, "0-1": Math.PI / 3, "0-2": Math.PI };
    const r = await sec([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
    expect(r["0-1"]).toBeCloseTo(2, 10);
    expect(r["0-2"]).toBeCloseTo(-1, 10);
  });
});

describe("sec — direct call: 2D matrix", () => {
  it("2x2 matrix → element-wise secants", async () => {
    const mat = { "0-0": 0, "0-1": Math.PI / 3, "1-0": Math.PI, "1-1": 2 * Math.PI };
    const r = await sec([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
    expect(r["0-1"]).toBeCloseTo(2, 10);
    expect(r["1-0"]).toBeCloseTo(-1, 10);
    expect(r["1-1"]).toBeCloseTo(1, 10);
  });
});

describe("sec — direct call: edge cases", () => {
  it("empty matrix → empty result", async () => {
    const r = await sec([{}], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(0);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("sec — pipeline: scalars", () => {
  it("x = sec(0) → 1", async () => {
    const r = await runPipeline(ctx("x = sec(0)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
  });

  it("x = sec(1.0471976) → 2 (sec(π/3))", async () => {
    const r = await runPipeline(ctx("x = sec(1.0471976)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(2, 4);
  });

  it("x = sec(3.1415927) → -1 (sec(π))", async () => {
    const r = await runPipeline(ctx("x = sec(3.1415927)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(-1, 4);
  });
});

describe("sec — pipeline: vector via documentEquations", () => {
  it("sec(v) on [0, π/3, π] → [1, 2, -1]", async () => {
    const vals = [0, Math.PI / 3, Math.PI];
    const expected = [1, 2, -1];
    const c = ctx("y = sec(v)");
    c.documentEquations = [makeVec("v", vals, -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expected.forEach((v, i) => {
      expect(r.solution.real[`0-${i}`]).toBeCloseTo(v, 4);
    });
  });
});

describe("sec — pipeline: inline 2D matrix", () => {
  it("sec([0,1.0471976;3.1415927,0]) → [1,2,-1,1]", async () => {
    const r = await runPipeline(ctx("y = sec([0,1.0471976;3.1415927,0])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(2, 4);
    expect(r.solution.real["1-0"]).toBeCloseTo(-1, 4);
    expect(r.solution.real["1-1"]).toBeCloseTo(1, 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────
// sec() receives the SI-converted numeric value of its argument.
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

describe("sec — degree unit (inline): deg converts to radians", () => {
  it("sec(0deg) → 1", async () => {
    const r = await runPipeline(ctx("x = sec(0deg)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
  });

  it("sec(60deg) → 2", async () => {
    const r = await runPipeline(ctx("x = sec(60deg)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(2, 4);
  });
});

describe("sec — degree unit (via variable)", () => {
  it("v = 60 deg → sec(v) = 2", async () => {
    const r = await solveWith("60", "deg", "sec(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(2, 4);
  });

  it("v = 0 deg → sec(v) = 1", async () => {
    const r = await solveWith("0", "deg", "sec(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(1, 4);
  });
});

describe("sec — converted units (ft): uses SI numeric value", () => {
  it("sec(1 ft) → sec(0.3048)", async () => {
    const r = await runPipeline(ctx("x = sec(1ft)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1 / Math.cos(FT_M), 4);
  });
});
