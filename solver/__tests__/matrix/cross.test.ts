/**
 * Tests for cross() — solver/functions/matrix/cross.ts
 *
 * Formula: 3D cross product of two 1×3 row vectors.
 *   result = [ a1*b2 - a2*b1,  -(a0*b2 - a2*b0),  a0*b1 - a1*b0 ]
 *
 * Direct-call tests:
 *   - [1,0,0] × [0,1,0] = [0,0,1]  (canonical basis cross product)
 *   - [1,2,3] × [4,5,6] = [-3,6,-3]
 *
 * Pipeline tests:
 *   - cross([1,0,0], [0,1,0]) → "0-2" = 1
 *   - cross(u, v) via documentEquations
 *
 * Unit tests:
 *   - cross uses SI values of arguments
 *   - cross([3ft,0,0], [0,2ft,0]) → "0-2" ≈ 6*FT_M*FT_M
 */

import { describe, it, expect } from "vitest";
import { cross } from "../../functions/matrix/cross";
import { runPipeline } from "../../pipeline";
import { ctx } from "../helpers";
import { solveDocument } from "../../worker/document-solver";
import type { ResolvedEquation, OrderedBlock } from "../../types";

const emptyBase: [number,number,number,number,number,number,number,number] = [0,0,0,0,0,0,0,0];

function makeVec3(name: string, a: number, b: number, c: number, order: number): ResolvedEquation {
  return {
    blockId: name, order, variableName: name,
    solution: { real: { "0-0": a, "0-1": b, "0-2": c }, imag: {}, size: "1x3", units: "", baseUnits: emptyBase, multiplier: 1 },
    error: null,
  };
}

async function solveWith(varVal: string, varUnit: string, fnExpr: string) {
  const blocks: OrderedBlock[] = [
    { id: "vb", order: 1, type: "EQUATION", definition: { raw: `v = ${varVal}`, variableName: "v", unit: varUnit } },
    { id: "xb", order: 2, type: "EQUATION", definition: { raw: `x = ${fnExpr}`, variableName: "x", unit: "" } },
  ];
  const r1 = await solveDocument(blocks, "vb", []);
  const r2 = await solveDocument(blocks, "xb", r1.resolvedMap);
  return r2.results.find((r) => r.blockId === "xb")!;
}

const FT_M = 0.3048;

// ── Direct call tests ──────────────────────────────────────────────────────────

describe("cross — direct call: basis vectors", () => {
  it("[1,0,0] × [0,1,0] = [0,0,1]", async () => {
    const a = { "0-0": 1, "0-1": 0, "0-2": 0 };
    const b = { "0-0": 0, "0-1": 1, "0-2": 0 };
    const r = await cross([a, b], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
    expect(r["0-1"]).toBeCloseTo(0, 10);
    expect(r["0-2"]).toBeCloseTo(1, 10);
  });

  it("[0,1,0] × [0,0,1] = [1,0,0]", async () => {
    const a = { "0-0": 0, "0-1": 1, "0-2": 0 };
    const b = { "0-0": 0, "0-1": 0, "0-2": 1 };
    const r = await cross([a, b], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
    expect(r["0-1"]).toBeCloseTo(0, 10);
    expect(r["0-2"]).toBeCloseTo(0, 10);
  });
});

describe("cross — direct call: [1,2,3] × [4,5,6]", () => {
  it("[1,2,3] × [4,5,6] = [-3,6,-3]", async () => {
    const a = { "0-0": 1, "0-1": 2, "0-2": 3 };
    const b = { "0-0": 4, "0-1": 5, "0-2": 6 };
    const r = await cross([a, b], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-3, 10);
    expect(r["0-1"]).toBeCloseTo(6, 10);
    expect(r["0-2"]).toBeCloseTo(-3, 10);
  });
});

describe("cross — direct call: anti-commutativity", () => {
  it("[1,0,0] × [0,0,1] = [0,1,0] negated i.e. [0,-1,0]", async () => {
    const a = { "0-0": 1, "0-1": 0, "0-2": 0 };
    const b = { "0-0": 0, "0-1": 0, "0-2": 1 };
    const r = await cross([a, b], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
    expect(r["0-1"]).toBeCloseTo(-1, 10);
    expect(r["0-2"]).toBeCloseTo(0, 10);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("cross — pipeline: basis vectors", () => {
  it("cross([1,0,0], [0,1,0]) → 0-2 = 1", async () => {
    const r = await runPipeline(ctx("x = cross([1,0,0], [0,1,0])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(0, 4);
    expect(r.solution.real["0-2"]).toBeCloseTo(1, 4);
  });
});

describe("cross — pipeline: documentEquations vectors", () => {
  it("cross(u, v) where u=[1,2,3], v=[4,5,6] → [-3,6,-3]", async () => {
    const c = ctx("y = cross(u, v)");
    c.documentEquations = [
      makeVec3("u", 1, 2, 3, -2),
      makeVec3("v", 4, 5, 6, -1),
    ];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(-3, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(6, 4);
    expect(r.solution.real["0-2"]).toBeCloseTo(-3, 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────

describe("cross — unit tests: SI values used in computation", () => {
  it("cross([3ft,0,0], [0,2ft,0]) → 0-2 ≈ 6*FT_M^2", async () => {
    const r = await runPipeline(ctx("x = cross([3ft,0,0], [0,2ft,0])"));
    expect(r.errors).toHaveLength(0);
    // a0*b1 - a1*b0 = (3*FT_M)*(2*FT_M) - 0 = 6 * FT_M^2
    expect(r.solution.real["0-2"]).toBeCloseTo(6 * FT_M * FT_M, 4);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(0, 4);
  });
});

// ── Unit-combining tests ───────────────────────────────────────────────────────

describe("cross — unit preservation (inline units, two args)", () => {
  async function solveCross(raw: string) {
    const block: OrderedBlock = { id: "b1", order: 1, type: "EQUATION", definition: { raw, variableName: "M" } };
    const r = await solveDocument([block], "b1", []);
    return r.results.find(res => res.blockId === "b1");
  }

  it("cross([1 m,0,0], [0,1 N,0]) → baseUnits non-zero (N·m = kg·m²/s²)", async () => {
    const blocks: OrderedBlock[] = [
      { id: "r1", order: 1, type: "EQUATION", definition: { raw: "rOF = [1 m, 0 m, 0 m]", variableName: "rOF" } },
      { id: "f1", order: 2, type: "EQUATION", definition: { raw: "F = [0 N, 1 N, 0 N]", variableName: "F" } },
      { id: "b1", order: 3, type: "EQUATION", definition: { raw: "M = Cross(rOF, F)", variableName: "M" } },
    ];
    const r1 = await solveDocument(blocks, "r1", []);
    const r2 = await solveDocument(blocks, "f1", r1.resolvedMap);
    const r3 = await solveDocument(blocks, "b1", r2.resolvedMap);
    const res = r3.results.find(res => res.blockId === "b1");
    expect(res?.errors).toHaveLength(0);
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });

  it("cross([4ft,1ft,1ft], [-20lbf,20lbf,10lbf]) → baseUnits non-zero", async () => {
    const blocks: OrderedBlock[] = [
      { id: "r1", order: 1, type: "EQUATION", definition: { raw: "rOF = [4ft, 1ft, 1ft]", variableName: "rOF" } },
      { id: "f1", order: 2, type: "EQUATION", definition: { raw: "Force = [-20lbf, 20lbf, 10lbf]", variableName: "Force" } },
      { id: "b1", order: 3, type: "EQUATION", definition: { raw: "Moment = Cross(rOF, Force)", variableName: "Moment" } },
    ];
    const r1 = await solveDocument(blocks, "r1", []);
    const r2 = await solveDocument(blocks, "f1", r1.resolvedMap);
    const r3 = await solveDocument(blocks, "b1", r2.resolvedMap);
    const res = r3.results.find(res => res.blockId === "b1");
    expect(res?.errors).toHaveLength(0);
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });

  it("cross(m-vector, kN-vector) → baseUnits non-zero", async () => {
    const blocks: OrderedBlock[] = [
      { id: "r1", order: 1, type: "EQUATION", definition: { raw: "r = [2 m, 0 m, 0 m]", variableName: "r" } },
      { id: "f1", order: 2, type: "EQUATION", definition: { raw: "F = [0 kN, 5 kN, 0 kN]", variableName: "F" } },
      { id: "b1", order: 3, type: "EQUATION", definition: { raw: "M = Cross(r, F)", variableName: "M" } },
    ];
    const r1 = await solveDocument(blocks, "r1", []);
    const r2 = await solveDocument(blocks, "f1", r1.resolvedMap);
    const r3 = await solveDocument(blocks, "b1", r2.resolvedMap);
    const res = r3.results.find(res => res.blockId === "b1");
    expect(res?.errors).toHaveLength(0);
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });
});
