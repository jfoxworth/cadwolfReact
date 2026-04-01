/**
 * Tests for createMatrix() — solver/functions/matrix/create-matrix.ts
 *
 * Formula: createMatrix(fillVal, imagDefault, rows, cols)
 * Creates a rows×cols matrix filled entirely with fillVal.
 * imagDefault is ignored (pipeline is real-only).
 *
 * Direct-call tests:
 *   - 2×2 filled with 5 → 4 elements all equal 5
 *   - 3×1 filled with 0 → 3 elements all equal 0
 *   - 1×1 fill with 7 → scalar 7
 *
 * Pipeline tests:
 *   - createMatrix(5, 0, 2, 3) → 6 elements all equal 5
 *   - createMatrix(0, 0, 3, 3) → 9 zeros
 *
 * Unit tests:
 *   - createMatrix() uses SI value of fillVal
 *   - createMatrix(2ft, 0, 2, 2) → fill value ≈ 2*FT_M
 */

import { describe, it, expect } from "vitest";
import { createMatrix } from "../../functions/matrix/create-matrix";
import { runPipeline } from "../../pipeline";
import { ctx } from "../helpers";
import { solveDocument } from "../../worker/document-solver";
import type { OrderedBlock } from "../../types";

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

describe("createMatrix — direct call: 2×2 filled with 5", () => {
  it("2×2 matrix filled with 5 → all elements = 5", async () => {
    const fill = { "0-0": 5 };
    const imag = { "0-0": 0 };
    const rows = { "0-0": 2 };
    const cols = { "0-0": 2 };
    const r = await createMatrix([fill, imag, rows, cols], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(5, 10);
    expect(r["0-1"]).toBeCloseTo(5, 10);
    expect(r["1-0"]).toBeCloseTo(5, 10);
    expect(r["1-1"]).toBeCloseTo(5, 10);
    expect(Object.keys(r)).toHaveLength(4);
  });
});

describe("createMatrix — direct call: 3×1 filled with 0", () => {
  it("3×1 matrix filled with 0 → 3 zeros", async () => {
    const fill = { "0-0": 0 };
    const imag = { "0-0": 0 };
    const rows = { "0-0": 3 };
    const cols = { "0-0": 1 };
    const r = await createMatrix([fill, imag, rows, cols], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
    expect(r["1-0"]).toBeCloseTo(0, 10);
    expect(r["2-0"]).toBeCloseTo(0, 10);
    expect(Object.keys(r)).toHaveLength(3);
  });
});

describe("createMatrix — direct call: 1×1 fill", () => {
  it("1×1 matrix filled with 7 → scalar 7", async () => {
    const fill = { "0-0": 7 };
    const imag = { "0-0": 0 };
    const rows = { "0-0": 1 };
    const cols = { "0-0": 1 };
    const r = await createMatrix([fill, imag, rows, cols], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(7, 10);
    expect(Object.keys(r)).toHaveLength(1);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("createMatrix — pipeline: 2×3 filled with 5", () => {
  it("createMatrix(5, 0, 2, 3) → 6 elements all equal 5", async () => {
    const r = await runPipeline(ctx("x = createMatrix(5, 0, 2, 3)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(5, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(5, 4);
    expect(r.solution.real["0-2"]).toBeCloseTo(5, 4);
    expect(r.solution.real["1-0"]).toBeCloseTo(5, 4);
    expect(r.solution.real["1-1"]).toBeCloseTo(5, 4);
    expect(r.solution.real["1-2"]).toBeCloseTo(5, 4);
  });
});

describe("createMatrix — pipeline: 3×3 zeros", () => {
  it("createMatrix(0, 0, 3, 3) → 9 zeros", async () => {
    const r = await runPipeline(ctx("x = createMatrix(0, 0, 3, 3)"));
    expect(r.errors).toHaveLength(0);
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        expect(r.solution.real[`${row}-${col}`]).toBeCloseTo(0, 4);
      }
    }
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────

describe("createMatrix — unit tests: fill uses SI value", () => {
  it("createMatrix(2ft, 0, 2, 2) → fill value ≈ 2*FT_M", async () => {
    const r = await runPipeline(ctx("x = createMatrix(2ft, 0, 2, 2)"));
    expect(r.errors).toHaveLength(0);
    const expected = 2 * FT_M;
    expect(r.solution.real["0-0"]).toBeCloseTo(expected, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(expected, 4);
    expect(r.solution.real["1-0"]).toBeCloseTo(expected, 4);
    expect(r.solution.real["1-1"]).toBeCloseTo(expected, 4);
  });

  it("v = 3 ft → createMatrix(v, 0, 2, 2) fills with 3*FT_M", async () => {
    const r = await solveWith("3", "ft", "createMatrix(v, 0, 2, 2)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(3 * FT_M, 4);
    expect(r.solution?.real["1-1"]).toBeCloseTo(3 * FT_M, 4);
  });
});
