/**
 * Tests for minu() — solver/functions/basic/minu.ts
 *
 * minu() is the unit-aware version of min() but has the same implementation:
 * returns Math.min(...Object.values(args[0])).
 *
 * Direct-call tests:
 *   - Single positive value → that value
 *   - Single negative value → that value
 *   - Row vector → min value
 *   - All negative values → most negative
 *   - Mixed positive/negative → most negative
 *   - 2D matrix → overall min
 *
 * Pipeline tests:
 *   - x = minu(7) → 7
 *   - Vector via documentEquations → min element
 */

import { describe, it, expect } from "vitest";
import { minu } from "../../functions/basic/minu";
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

describe("minu — direct call: scalars", () => {
  it("single positive value → that value", async () => {
    const r = await minu([{ "0-0": 7 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(7, 10);
  });

  it("single negative value → that value", async () => {
    const r = await minu([{ "0-0": -3 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-3, 10);
  });

  it("zero → 0", async () => {
    const r = await minu([{ "0-0": 0 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });
});

describe("minu — direct call: row vectors", () => {
  it("row vector → min value", async () => {
    const r = await minu([{ "0-0": 9, "0-1": 3, "0-2": 6 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(3, 10);
  });

  it("all negative → most negative", async () => {
    const r = await minu([{ "0-0": -10, "0-1": -3, "0-2": -7 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-10, 10);
  });

  it("mixed positive/negative → most negative", async () => {
    const r = await minu([{ "0-0": 5, "0-1": -4, "0-2": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-4, 10);
  });

  it("floats → correct min", async () => {
    const r = await minu([{ "0-0": 1.1, "0-1": 0.3, "0-2": 2.2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0.3, 10);
  });
});

describe("minu — direct call: 2D matrix", () => {
  it("2x2 matrix → overall min", async () => {
    const mat = { "0-0": 4, "0-1": 1, "1-0": 3, "1-1": 2 };
    const r = await minu([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
  });

  it("3x2 matrix → overall min", async () => {
    const mat = { "0-0": 7, "0-1": 2, "1-0": 4, "1-1": 9, "2-0": 1, "2-1": 6 };
    const r = await minu([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("minu — pipeline: scalars", () => {
  it("x = minu(7) → 7", async () => {
    const r = await runPipeline(ctx("x = minu(7)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(7, 4);
  });

  it("x = minu(-3) → -3", async () => {
    const r = await runPipeline(ctx("x = minu(-3)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(-3, 4);
  });
});

describe("minu — pipeline: vector via documentEquations", () => {
  it("minu(v) on [2, 8, 1, 5] → 1", async () => {
    const c = ctx("y = minu(v)");
    c.documentEquations = [makeVec("v", [2, 8, 1, 5], -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
  });

  it("minu(v) on all-negative vector → most negative", async () => {
    const c = ctx("y = minu(v)");
    c.documentEquations = [makeVec("v", [-4, -1, -9, -2], -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(-9, 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────

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

describe("minu — simple units (m)", () => {
  it("minu(7 m) → 7 m", async () => {
    const r = await solveWith("7", "m", "minu(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(7, 4);
  });

  it("minu(-3 m) → -3 m", async () => {
    const r = await solveWith("-3", "m", "minu(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(-3, 4);
  });
});

describe("minu — compound units (m/s)", () => {
  it("minu(-5 m/s) → -5 m/s", async () => {
    const r = await solveWith("-5", "m/s", "minu(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(-5, 4);
  });
});

describe("minu — converted units (ft)", () => {
  it("minu(-5ft) → -5 × 0.3048 m", async () => {
    const r = await runPipeline(ctx("x = minu(-5ft)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(-5 * FT_M, 4);
  });
});
