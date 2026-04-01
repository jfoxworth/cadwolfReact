/**
 * Tests for mode() — solver/functions/stats/mode.ts
 *
 * Formula: Returns the most frequently occurring value. If there is a tie,
 * returns the value whose key comes last in Object.keys(freq).reduce() comparison.
 * Collapses any matrix to a single scalar.
 *
 * Direct-call tests:
 *   - Single element → that value
 *   - Clear mode → most frequent value
 *   - All unique (no repeat) → behavior depends on freq map order
 *   - Two modes (tie) → one of the tied values (implementation-dependent)
 *   - Mode is the largest value in a tie → correct
 *   - Negative mode → most frequent negative value
 *
 * Pipeline tests:
 *   - x = mode(5) → 5
 *   - Vector via documentEquations → mode value
 *
 * Unit tests:
 *   - mode() operates on the SI-converted numeric values
 *   - mode(7 m) → 7
 *   - mode(5ft) → 5 × 0.3048
 */

import { describe, it, expect } from "vitest";
import { mode } from "../../functions/stats/mode";
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

describe("mode — direct call: scalars", () => {
  it("single element → that value", async () => {
    const r = await mode([{ "0-0": 5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(5, 10);
  });

  it("single negative value → that value", async () => {
    const r = await mode([{ "0-0": -3 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-3, 10);
  });
});

describe("mode — direct call: clear mode", () => {
  it("[1, 2, 2, 3] → 2", async () => {
    const r = await mode([{ "0-0": 1, "0-1": 2, "0-2": 2, "0-3": 3 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(2, 10);
  });

  it("[3, 3, 3, 1, 2] → 3", async () => {
    const r = await mode([{ "0-0": 3, "0-1": 3, "0-2": 3, "0-3": 1, "0-4": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(3, 10);
  });

  it("[1, 2, 2, 3, 3, 3] → 3 (most frequent)", async () => {
    const r = await mode([{ "0-0": 1, "0-1": 2, "0-2": 2, "0-3": 3, "0-4": 3, "0-5": 3 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(3, 10);
  });

  it("negative mode: [-2, -2, -1] → -2", async () => {
    const r = await mode([{ "0-0": -2, "0-1": -2, "0-2": -1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-2, 10);
  });

  it("float mode: [1.5, 1.5, 2.5] → 1.5", async () => {
    const r = await mode([{ "0-0": 1.5, "0-1": 1.5, "0-2": 2.5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1.5, 10);
  });
});

describe("mode — direct call: 2D matrix", () => {
  it("2x3 matrix with a clear mode → returns mode", async () => {
    // Values: 1, 2, 2, 3, 3, 3 — mode is 3
    const mat = { "0-0": 1, "0-1": 2, "0-2": 2, "1-0": 3, "1-1": 3, "1-2": 3 };
    const r = await mode([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(3, 10);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("mode — pipeline: scalars", () => {
  it("x = mode(5) → 5", async () => {
    const r = await runPipeline(ctx("x = mode(5)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(5, 4);
  });
});

describe("mode — pipeline: vector via documentEquations", () => {
  it("mode(v) on [1, 2, 2, 3, 3, 3] → 3", async () => {
    const c = ctx("y = mode(v)");
    c.documentEquations = [makeVec("v", [1, 2, 2, 3, 3, 3], -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(3, 4);
  });

  it("mode(v) on [4, 4, 5, 5, 5, 6] → 5", async () => {
    const c = ctx("y = mode(v)");
    c.documentEquations = [makeVec("v", [4, 4, 5, 5, 5, 6], -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(5, 4);
  });
});

describe("mode — pipeline: inline 2D matrix", () => {
  it("mode([1,2;2,3]) → 2 (appears twice)", async () => {
    const r = await runPipeline(ctx("y = mode([1,2;2,3])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(2, 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────
// mode() operates on the SI-converted numeric values of its argument.

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

describe("mode — simple units (m): uses SI value", () => {
  it("mode(7 m) → 7 (scalar passthrough)", async () => {
    const r = await solveWith("7", "m", "mode(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(7, 4);
  });
});

describe("mode — compound units (m/s): uses SI value", () => {
  it("mode(3 m/s) → 3", async () => {
    const r = await solveWith("3", "m/s", "mode(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(3, 4);
  });
});

describe("mode — converted units (ft): uses SI numeric value", () => {
  it("mode(5ft) → 5 × 0.3048 (scalar)", async () => {
    const r = await runPipeline(ctx("x = mode(5ft)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(5 * FT_M, 4);
  });

  it("v = 5 ft → mode(v) = 5 × 0.3048", async () => {
    const r = await solveWith("5", "ft", "mode(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(5 * FT_M, 4);
  });
});
