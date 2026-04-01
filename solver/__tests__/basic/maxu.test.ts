/**
 * Tests for maxu() — solver/functions/basic/maxu.ts
 *
 * maxu() is the unit-aware version of max() but has the same implementation:
 * returns Math.max(...Object.values(args[0])).
 *
 * Direct-call tests:
 *   - Single positive value → that value
 *   - Single negative value → that value
 *   - Row vector → max value
 *   - All negative values → least negative
 *   - Mixed positive/negative → largest
 *   - 2D matrix → overall max
 *
 * Pipeline tests:
 *   - x = maxu(7) → 7
 *   - Vector via documentEquations → max element
 */

import { describe, it, expect } from "vitest";
import { maxu } from "../../functions/basic/maxu";
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

describe("maxu — direct call: scalars", () => {
  it("single positive value → that value", async () => {
    const r = await maxu([{ "0-0": 7 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(7, 10);
  });

  it("single negative value → that value", async () => {
    const r = await maxu([{ "0-0": -3 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-3, 10);
  });

  it("zero → 0", async () => {
    const r = await maxu([{ "0-0": 0 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });
});

describe("maxu — direct call: row vectors", () => {
  it("row vector → max value", async () => {
    const r = await maxu([{ "0-0": 3, "0-1": 9, "0-2": 1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(9, 10);
  });

  it("all negative → least negative", async () => {
    const r = await maxu([{ "0-0": -10, "0-1": -3, "0-2": -7 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-3, 10);
  });

  it("mixed positive/negative → largest", async () => {
    const r = await maxu([{ "0-0": -5, "0-1": 4, "0-2": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(4, 10);
  });

  it("floats → correct max", async () => {
    const r = await maxu([{ "0-0": 1.1, "0-1": 3.3, "0-2": 2.2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(3.3, 10);
  });
});

describe("maxu — direct call: 2D matrix", () => {
  it("2x2 matrix → overall max", async () => {
    const mat = { "0-0": 1, "0-1": 5, "1-0": 3, "1-1": 2 };
    const r = await maxu([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(5, 10);
  });

  it("3x2 matrix → overall max", async () => {
    const mat = { "0-0": 7, "0-1": 2, "1-0": 4, "1-1": 9, "2-0": 1, "2-1": 6 };
    const r = await maxu([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(9, 10);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("maxu — pipeline: scalars", () => {
  it("x = maxu(7) → 7", async () => {
    const r = await runPipeline(ctx("x = maxu(7)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(7, 4);
  });

  it("x = maxu(-3) → -3", async () => {
    const r = await runPipeline(ctx("x = maxu(-3)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(-3, 4);
  });
});

describe("maxu — pipeline: vector via documentEquations", () => {
  it("maxu(v) on [2, 8, 5, 1] → 8", async () => {
    const c = ctx("y = maxu(v)");
    c.documentEquations = [makeVec("v", [2, 8, 5, 1], -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(8, 4);
  });

  it("maxu(v) on all-negative vector → least negative", async () => {
    const c = ctx("y = maxu(v)");
    c.documentEquations = [makeVec("v", [-4, -1, -9, -2], -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(-1, 4);
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

describe("maxu — simple units (m)", () => {
  it("maxu(7 m) → 7 m", async () => {
    const r = await solveWith("7", "m", "maxu(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(7, 4);
  });

  it("maxu(-3 m) → -3 m", async () => {
    const r = await solveWith("-3", "m", "maxu(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(-3, 4);
  });
});

describe("maxu — compound units (m/s)", () => {
  it("maxu(5 m/s) → 5 m/s", async () => {
    const r = await solveWith("5", "m/s", "maxu(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(5, 4);
  });
});

describe("maxu — converted units (ft)", () => {
  it("maxu(5ft) → 5 × 0.3048 m", async () => {
    const r = await runPipeline(ctx("x = maxu(5ft)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(5 * FT_M, 4);
  });
});
