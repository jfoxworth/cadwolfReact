/**
 * Tests for numInds() — solver/functions/data/num-inds.ts
 *
 * Formula: returns 1 if input is scalar (single "0-0" key), 2 otherwise
 *
 * Direct-call tests:
 *   - Scalar { "0-0": 5 } → 1
 *   - Row vector (2+ elements) → 2
 *   - Column vector (2+ elements) → 2
 *   - 2D matrix → 2
 *
 * Pipeline tests:
 *   - numInds(5) → 1
 *   - numInds([1,2,3]) → 2
 *   - numInds([1,2;3,4]) → 2
 *
 * Unit tests:
 *   - numInds(5m) → 1 (scalar with units is still scalar)
 *   - numInds applied to a vector variable → 2
 */

import { describe, it, expect } from "vitest";
import { numInds } from "../../functions/data/num-inds";
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

describe("numInds — direct call: scalar → 1", () => {
  it("{ '0-0': 5 } → 1", async () => {
    const r = await numInds([{ "0-0": 5 }], ctx("x=0"));
    expect(r["0-0"]).toBe(1);
  });

  it("{ '0-0': -3 } → 1", async () => {
    const r = await numInds([{ "0-0": -3 }], ctx("x=0"));
    expect(r["0-0"]).toBe(1);
  });

  it("{ '0-0': 0 } → 1", async () => {
    const r = await numInds([{ "0-0": 0 }], ctx("x=0"));
    expect(r["0-0"]).toBe(1);
  });
});

describe("numInds — direct call: vector/matrix → 2", () => {
  it("row vector [1,2] → 2", async () => {
    const r = await numInds([{ "0-0": 1, "0-1": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBe(2);
  });

  it("row vector [1,2,3,4,5] → 2", async () => {
    const r = await numInds([{ "0-0": 1, "0-1": 2, "0-2": 3, "0-3": 4, "0-4": 5 }], ctx("x=0"));
    expect(r["0-0"]).toBe(2);
  });

  it("column vector (2 rows) → 2", async () => {
    const r = await numInds([{ "0-0": 1, "1-0": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBe(2);
  });

  it("2×2 matrix → 2", async () => {
    const r = await numInds([{ "0-0": 1, "0-1": 2, "1-0": 3, "1-1": 4 }], ctx("x=0"));
    expect(r["0-0"]).toBe(2);
  });

  it("3×3 matrix → 2", async () => {
    const mat: Record<string, number> = {};
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) mat[`${i}-${j}`] = 1;
    const r = await numInds([mat], ctx("x=0"));
    expect(r["0-0"]).toBe(2);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("numInds — pipeline: scalar → 1", () => {
  it("numInds(5) → 1", async () => {
    const r = await runPipeline(ctx("x = numInds(5)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBe(1);
  });

  it("numInds(0) → 1", async () => {
    const r = await runPipeline(ctx("x = numInds(0)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBe(1);
  });
});

describe("numInds — pipeline: vector/matrix → 2", () => {
  it("numInds([1,2,3]) → 2", async () => {
    const r = await runPipeline(ctx("x = numInds([1,2,3])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBe(2);
  });

  it("numInds([1,2;3,4]) → 2", async () => {
    const r = await runPipeline(ctx("x = numInds([1,2;3,4])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBe(2);
  });
});

describe("numInds — pipeline: vector via documentEquations → 2", () => {
  it("numInds(v) where v=[1,2,3] → 2", async () => {
    const c = ctx("y = numInds(v)");
    c.documentEquations = [makeVec("v", [1, 2, 3], -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBe(2);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────

async function solveWith(varVal: string, varUnit: string, fnExpr: string) {
  const blocks: OrderedBlock[] = [
    { id: "vb", order: 1, type: "EQUATION", definition: { raw: `v = ${varVal}`, variableName: "v", unit: varUnit } },
    { id: "xb", order: 2, type: "EQUATION", definition: { raw: `x = ${fnExpr}`, variableName: "x", unit: "" } },
  ];
  const r1 = await solveDocument(blocks, "vb", []);
  const r2 = await solveDocument(blocks, "xb", r1.resolvedMap);
  return r2.results.find((r) => r.blockId === "xb")!;
}

describe("numInds — unit tests: scalar with units → 1", () => {
  it("numInds(5m) → 1", async () => {
    const r = await solveWith("5", "m", "numInds(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBe(1);
  });

  it("numInds(5ft) inline → 1", async () => {
    const r = await runPipeline(ctx("x = numInds(5ft)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBe(1);
  });

  it("numInds(5 m/s) → 1 (scalar with compound unit)", async () => {
    const r = await solveWith("5", "m/s", "numInds(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBe(1);
  });
});
