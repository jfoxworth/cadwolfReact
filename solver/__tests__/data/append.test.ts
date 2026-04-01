/**
 * Tests for append() — solver/functions/data/append.ts
 *
 * Formula: Append(mat1, mat2, index)
 *   index=0 → vertical stack (append rows)
 *   index=1 → horizontal stack (append columns)
 *
 * Direct-call tests:
 *   - Horizontal: two row vectors → single longer row vector
 *   - Vertical: two row vectors → 2-row matrix
 *   - Mixed sizes: wider mat + narrower mat vertically
 *   - 2D matrices horizontally and vertically
 *   - Empty second matrix → original returned
 *
 * Pipeline tests:
 *   - append([1,2,3], [4,5,6], 1) → [1,2,3,4,5,6]
 *   - append([1,2,3], [4,5,6], 0) → [[1,2,3],[4,5,6]]
 *   - append([1,2;3,4], [5,6;7,8], 1) → [1,2,5,6;3,4,7,8]
 *
 * Unit tests:
 *   - append() operates on SI-converted values; structure is preserved
 *   - append(v, w, 1) where v and w bear units → correct horizontal concat
 */

import { describe, it, expect } from "vitest";
import { append } from "../../functions/data/append";
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

describe("append — direct call: horizontal (index=1)", () => {
  it("[1,2,3] + [4,5,6] → [1,2,3,4,5,6]", async () => {
    const mat1 = { "0-0": 1, "0-1": 2, "0-2": 3 };
    const mat2 = { "0-0": 4, "0-1": 5, "0-2": 6 };
    const idx  = { "0-0": 1 };
    const r = await append([mat1, mat2, idx], ctx("x=0"));
    expect(r["0-0"]).toBe(1);
    expect(r["0-1"]).toBe(2);
    expect(r["0-2"]).toBe(3);
    expect(r["0-3"]).toBe(4);
    expect(r["0-4"]).toBe(5);
    expect(r["0-5"]).toBe(6);
    expect(Object.keys(r)).toHaveLength(6);
  });

  it("[1,2] + [3] → [1,2,3]", async () => {
    const r = await append([{ "0-0": 1, "0-1": 2 }, { "0-0": 3 }, { "0-0": 1 }], ctx("x=0"));
    expect(r["0-0"]).toBe(1);
    expect(r["0-1"]).toBe(2);
    expect(r["0-2"]).toBe(3);
  });

  it("2×2 matrices side-by-side → 2×4", async () => {
    const mat1 = { "0-0": 1, "0-1": 2, "1-0": 3, "1-1": 4 };
    const mat2 = { "0-0": 5, "0-1": 6, "1-0": 7, "1-1": 8 };
    const r = await append([mat1, mat2, { "0-0": 1 }], ctx("x=0"));
    expect(r["0-0"]).toBe(1); expect(r["0-1"]).toBe(2);
    expect(r["0-2"]).toBe(5); expect(r["0-3"]).toBe(6);
    expect(r["1-0"]).toBe(3); expect(r["1-1"]).toBe(4);
    expect(r["1-2"]).toBe(7); expect(r["1-3"]).toBe(8);
    expect(Object.keys(r)).toHaveLength(8);
  });
});

describe("append — direct call: vertical (index=0)", () => {
  it("[1,2,3] on top of [4,5,6] → 2×3 matrix", async () => {
    const mat1 = { "0-0": 1, "0-1": 2, "0-2": 3 };
    const mat2 = { "0-0": 4, "0-1": 5, "0-2": 6 };
    const r = await append([mat1, mat2, { "0-0": 0 }], ctx("x=0"));
    expect(r["0-0"]).toBe(1); expect(r["0-1"]).toBe(2); expect(r["0-2"]).toBe(3);
    expect(r["1-0"]).toBe(4); expect(r["1-1"]).toBe(5); expect(r["1-2"]).toBe(6);
    expect(Object.keys(r)).toHaveLength(6);
  });

  it("stacking scalars → 2×1 column", async () => {
    const r = await append([{ "0-0": 10 }, { "0-0": 20 }, { "0-0": 0 }], ctx("x=0"));
    expect(r["0-0"]).toBe(10);
    expect(r["1-0"]).toBe(20);
    expect(Object.keys(r)).toHaveLength(2);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("append — pipeline: horizontal", () => {
  it("append([1,2,3], [4,5,6], 1) → first element is 1, 4th is 4", async () => {
    const r = await runPipeline(ctx("x = append([1,2,3], [4,5,6], 1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
    expect(r.solution.real["0-3"]).toBeCloseTo(4, 4);
  });

  it("append([1,2;3,4], [5,6;7,8], 1) → 2×4 matrix", async () => {
    const r = await runPipeline(ctx("x = append([1,2;3,4], [5,6;7,8], 1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-2"]).toBeCloseTo(5, 4);
    expect(r.solution.real["1-2"]).toBeCloseTo(7, 4);
  });
});

describe("append — pipeline: vertical", () => {
  it("append([1,2,3], [4,5,6], 0) → 2×3 matrix", async () => {
    const r = await runPipeline(ctx("x = append([1,2,3], [4,5,6], 0)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
    expect(r.solution.real["1-0"]).toBeCloseTo(4, 4);
    expect(r.solution.real["1-2"]).toBeCloseTo(6, 4);
  });
});

describe("append — pipeline: vector via documentEquations", () => {
  it("append(v, w, 1) where v=[1,2], w=[3,4] → [1,2,3,4]", async () => {
    const c = ctx("y = append(v, w, 1)");
    c.documentEquations = [
      makeVec("v", [1, 2], -2),
      makeVec("w", [3, 4], -1),
    ];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
    expect(r.solution.real["0-2"]).toBeCloseTo(3, 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────

async function solveWith(def1: string, unit1: string, def2: string, unit2: string, fnExpr: string) {
  const blocks: OrderedBlock[] = [
    { id: "ab", order: 1, type: "EQUATION", definition: { raw: `a = ${def1}`, variableName: "a", unit: unit1 } },
    { id: "bb", order: 2, type: "EQUATION", definition: { raw: `b = ${def2}`, variableName: "b", unit: unit2 } },
    { id: "xb", order: 3, type: "EQUATION", definition: { raw: `x = ${fnExpr}`, variableName: "x", unit: "" } },
  ];
  const r1 = await solveDocument(blocks, "ab", []);
  const r2 = await solveDocument(blocks, "bb", r1.resolvedMap);
  const r3 = await solveDocument(blocks, "xb", r2.resolvedMap);
  return r3.results.find((r) => r.blockId === "xb")!;
}

describe("append — unit tests: SI values are used", () => {
  it("append(a, b, 1) where a=1m, b=2m → concat of SI values", async () => {
    const r = await solveWith("1", "m", "2", "m", "append(a, b, 1)");
    expect(r.errors).toHaveLength(0);
    // SI values: a=1, b=2 → concat = [1, 2]
    expect(r.solution?.real["0-0"]).toBeCloseTo(1, 4);
    expect(r.solution?.real["0-1"]).toBeCloseTo(2, 4);
  });
});
