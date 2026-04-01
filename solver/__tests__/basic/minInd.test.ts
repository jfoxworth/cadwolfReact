/**
 * Tests for minInd() — solver/functions/basic/minInd.ts
 *
 * Returns the 0-based index of the minimum value among Object.values(args[0]).
 * Note: index is based on Object.values() ordering (insertion order for numeric keys).
 *
 * Direct-call tests:
 *   - Single element → index 0
 *   - Min at index 0 → 0
 *   - Min at last index → N-1
 *   - Min in middle → correct middle index
 *   - All same values → index 0 (first occurrence via indexOf)
 *   - All negative values → index of most-negative
 *   - Float values → correct index
 *
 * Pipeline tests:
 *   - Vector via documentEquations → correct 0-based index of min
 *   - Single value via pipeline → 0
 */

import { describe, it, expect } from "vitest";
import { minInd } from "../../functions/basic/minInd";
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

describe("minInd — direct call", () => {
  it("single element → index 0", async () => {
    const r = await minInd([{ "0-0": 42 }], ctx("x=0"));
    expect(r["0-0"]).toBe(0);
  });

  it("min at index 0 (start) → 0", async () => {
    const r = await minInd([{ "0-0": 1, "0-1": 5, "0-2": 3 }], ctx("x=0"));
    expect(r["0-0"]).toBe(0);
  });

  it("min at last index → N-1", async () => {
    const r = await minInd([{ "0-0": 9, "0-1": 5, "0-2": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBe(2);
  });

  it("min in middle → middle index", async () => {
    const r = await minInd([{ "0-0": 8, "0-1": 2, "0-2": 6 }], ctx("x=0"));
    expect(r["0-0"]).toBe(1);
  });

  it("all same values → first occurrence (index 0)", async () => {
    const r = await minInd([{ "0-0": 5, "0-1": 5, "0-2": 5 }], ctx("x=0"));
    expect(r["0-0"]).toBe(0);
  });

  it("all negative values → index of most-negative", async () => {
    const r = await minInd([{ "0-0": -10, "0-1": -3, "0-2": -7 }], ctx("x=0"));
    expect(r["0-0"]).toBe(0);
  });

  it("float values → correct index", async () => {
    const r = await minInd([{ "0-0": 1.5, "0-1": 0.3, "0-2": 2.6 }], ctx("x=0"));
    expect(r["0-0"]).toBe(1);
  });

  it("mixed positive and negative → index of most-negative", async () => {
    const r = await minInd([{ "0-0": -5, "0-1": 3, "0-2": -1, "0-3": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBe(0);
  });

  it("5-element vector, min at index 2", async () => {
    const r = await minInd([{
      "0-0": 5, "0-1": 4, "0-2": 1, "0-3": 3, "0-4": 2,
    }], ctx("x=0"));
    expect(r["0-0"]).toBe(2);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("minInd — pipeline: vector via documentEquations", () => {
  it("minInd(v) on [2, 8, 1, 5] → index 2", async () => {
    const c = ctx("y = minInd(v)");
    c.documentEquations = [makeVec("v", [2, 8, 1, 5], -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(2, 4);
  });

  it("minInd(v) on [10, 3, 7, 2, 9] → index 3", async () => {
    const c = ctx("y = minInd(v)");
    c.documentEquations = [makeVec("v", [10, 3, 7, 2, 9], -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(3, 4);
  });

  it("minInd(v) on all-negative vector → index of most-negative", async () => {
    const c = ctx("y = minInd(v)");
    c.documentEquations = [makeVec("v", [-4, -1, -9, -2], -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(2, 4);
  });

  it("minInd on single scalar → index 0", async () => {
    const r = await runPipeline(ctx("y = minInd(42)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────
// minInd returns a dimensionless index regardless of input units.

async function solveWith(varVal: string, varUnit: string, fnExpr: string) {
  const blocks: OrderedBlock[] = [
    { id: "vb", order: 1, type: "EQUATION", definition: { raw: `v = ${varVal}`, variableName: "v", unit: varUnit } },
    { id: "xb", order: 2, type: "EQUATION", definition: { raw: `x = ${fnExpr}`, variableName: "x", unit: "" } },
  ];
  const r1 = await solveDocument(blocks, "vb", []);
  const r2 = await solveDocument(blocks, "xb", r1.resolvedMap);
  return r2.results.find((r) => r.blockId === "xb")!;
}

describe("minInd — simple units (m): index is dimensionless", () => {
  it("minInd of single 5 m → index 0", async () => {
    const r = await solveWith("5", "m", "minInd(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(0, 4);
  });
});

describe("minInd — compound units (m/s)", () => {
  it("minInd of single -10 m/s → index 0", async () => {
    const r = await solveWith("-10", "m/s", "minInd(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(0, 4);
  });
});

describe("minInd — converted units (ft): index dimensionless", () => {
  it("minInd of -3 ft → index 0", async () => {
    const r = await solveWith("-3", "ft", "minInd(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(0, 4);
  });
});
