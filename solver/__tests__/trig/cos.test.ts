/**
 * Tests for cos() — solver/functions/trig/cos.ts
 *
 * Formula: elementwise(args[0], Math.cos)
 * Input is treated as radians. Returns dimensionless result element-wise.
 *
 * Direct-call tests:
 *   - cos(0) → 1
 *   - cos(π/2) → ≈0
 *   - cos(π) → -1
 *   - cos(-π) → -1
 *   - cos(π/3) → 0.5
 *   - Row vector → element-wise cosines
 *   - 2D matrix → element-wise cosines
 *   - Empty matrix → empty
 *
 * Pipeline tests:
 *   - x = cos(0) → 1
 *   - x = cos(3.1415927) → -1
 *   - x = cos(1.0471976) → 0.5
 *   - Vector via documentEquations → element-wise cosines
 *   - Inline 2D matrix literal → element-wise cosines
 *
 * Unit tests:
 *   - cos() operates on the SI-converted numeric value of its argument
 *   - cos(0 deg) → 1
 *   - cos(60 deg) → 0.5
 *   - cos(90 deg) → ≈0
 *   - cos(180 deg) → -1
 *   - cos(v) where v stored in deg → uses SI radian value
 *   - cos(1 ft) → cos(0.3048)
 */

import { describe, it, expect } from "vitest";
import { cos } from "../../functions/trig/cos";
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

describe("cos — direct call: scalars", () => {
  it("cos(0) → 1", async () => {
    const r = await cos([{ "0-0": 0 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
  });

  it("cos(π/2) → ≈0", async () => {
    const r = await cos([{ "0-0": Math.PI / 2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });

  it("cos(π) → -1", async () => {
    const r = await cos([{ "0-0": Math.PI }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-1, 10);
  });

  it("cos(-π) → -1", async () => {
    const r = await cos([{ "0-0": -Math.PI }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-1, 10);
  });

  it("cos(π/3) → 0.5", async () => {
    const r = await cos([{ "0-0": Math.PI / 3 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0.5, 10);
  });

  it("cos(π/4) → √2/2", async () => {
    const r = await cos([{ "0-0": Math.PI / 4 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.SQRT2 / 2, 10);
  });
});

describe("cos — direct call: vectors", () => {
  it("row vector [0, π/3, π/2, π] → [1, 0.5, ≈0, -1]", async () => {
    const mat = { "0-0": 0, "0-1": Math.PI / 3, "0-2": Math.PI / 2, "0-3": Math.PI };
    const r = await cos([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
    expect(r["0-1"]).toBeCloseTo(0.5, 10);
    expect(r["0-2"]).toBeCloseTo(0, 10);
    expect(r["0-3"]).toBeCloseTo(-1, 10);
  });
});

describe("cos — direct call: 2D matrix", () => {
  it("2x2 matrix → element-wise cosines", async () => {
    const mat = { "0-0": 0, "0-1": Math.PI / 3, "1-0": Math.PI / 2, "1-1": Math.PI };
    const r = await cos([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
    expect(r["0-1"]).toBeCloseTo(0.5, 10);
    expect(r["1-0"]).toBeCloseTo(0, 10);
    expect(r["1-1"]).toBeCloseTo(-1, 10);
  });
});

describe("cos — direct call: edge cases", () => {
  it("empty matrix → empty result", async () => {
    const r = await cos([{}], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(0);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("cos — pipeline: scalars", () => {
  it("x = cos(0) → 1", async () => {
    const r = await runPipeline(ctx("x = cos(0)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
  });

  it("x = cos(3.1415927) → -1", async () => {
    const r = await runPipeline(ctx("x = cos(3.1415927)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(-1, 4);
  });

  it("x = cos(1.0471976) → 0.5 (cos(π/3))", async () => {
    const r = await runPipeline(ctx("x = cos(1.0471976)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0.5, 4);
  });
});

describe("cos — pipeline: vector via documentEquations", () => {
  it("cos(v) on [0, π/6, π/4, π/3, π/2] → element-wise cosines", async () => {
    const vals = [0, Math.PI / 6, Math.PI / 4, Math.PI / 3, Math.PI / 2];
    const c = ctx("y = cos(v)");
    c.documentEquations = [makeVec("v", vals, -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    vals.forEach((v, i) => {
      expect(r.solution.real[`0-${i}`]).toBeCloseTo(Math.cos(v), 4);
    });
  });
});

describe("cos — pipeline: inline 2D matrix", () => {
  it("cos([0,1.0471976;1.5707963,3.1415927]) → element-wise cosines", async () => {
    const r = await runPipeline(ctx("y = cos([0,1.0471976;1.5707963,3.1415927])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(0.5, 4);
    expect(r.solution.real["1-0"]).toBeCloseTo(0, 4);
    expect(r.solution.real["1-1"]).toBeCloseTo(-1, 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────
// cos() receives the SI-converted numeric value of its argument.
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

describe("cos — degree unit (inline): deg converts to radians", () => {
  it("cos(0deg) → 1", async () => {
    const r = await runPipeline(ctx("x = cos(0deg)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
  });

  it("cos(60deg) → 0.5", async () => {
    const r = await runPipeline(ctx("x = cos(60deg)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0.5, 4);
  });

  it("cos(90deg) → ≈0", async () => {
    const r = await runPipeline(ctx("x = cos(90deg)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });

  it("cos(180deg) → -1", async () => {
    const r = await runPipeline(ctx("x = cos(180deg)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(-1, 4);
  });
});

describe("cos — degree unit (via variable)", () => {
  it("v = 60 deg → cos(v) = 0.5", async () => {
    const r = await solveWith("60", "deg", "cos(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(0.5, 4);
  });

  it("v = 0 deg → cos(v) = 1", async () => {
    const r = await solveWith("0", "deg", "cos(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(1, 4);
  });
});

describe("cos — converted units (ft): uses SI numeric value", () => {
  it("cos(1 ft) → cos(0.3048)", async () => {
    const r = await runPipeline(ctx("x = cos(1ft)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.cos(FT_M), 4);
  });

  it("v = 1 ft → cos(v) = cos(0.3048)", async () => {
    const r = await solveWith("1", "ft", "cos(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(Math.cos(FT_M), 4);
  });
});
