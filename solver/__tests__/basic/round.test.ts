/**
 * Tests for round() — solver/functions/basic/round.ts
 *
 * Formula: Math.round(val * 10^n) / 10^n
 * n = second arg (default 0). n is snapped to integer via Math.round(args[1]["0-0"]).
 * Applies element-wise to all matrix entries.
 *
 * Direct-call tests:
 *   - Default precision (n=0): rounds to nearest integer
 *   - n=2: rounds to 2 decimal places
 *   - n=-1: rounds to nearest 10
 *   - Negative input with n=0
 *   - Half-integer cases (0.5 rounds up in JS)
 *   - Row vector, n=0 → element-wise
 *   - 2D matrix, n=0 → element-wise
 *   - Empty matrix → empty
 *
 * Pipeline tests:
 *   - x = round(3.4) → 3
 *   - x = round(3.5) → 4
 *   - x = round(3.9) → 4
 *   - x = round(3.14159, 2) → 3.14
 *   - Vector via documentEquations → element-wise round
 *   - Inline 2D matrix literal → element-wise round
 */

import { describe, it, expect } from "vitest";
import { round } from "../../functions/basic/round";
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

describe("round — direct call: scalar, default precision (n=0)", () => {
  it("3.4 → 3", async () => {
    const r = await round([{ "0-0": 3.4 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(3, 10);
  });

  it("3.5 → 4 (half rounds up)", async () => {
    const r = await round([{ "0-0": 3.5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(4, 10);
  });

  it("3.9 → 4", async () => {
    const r = await round([{ "0-0": 3.9 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(4, 10);
  });

  it("negative: -3.4 → -3", async () => {
    const r = await round([{ "0-0": -3.4 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-3, 10);
  });

  it("negative: -3.9 → -4", async () => {
    const r = await round([{ "0-0": -3.9 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-4, 10);
  });

  it("exact integer → unchanged", async () => {
    const r = await round([{ "0-0": 5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(5, 10);
  });

  it("zero → 0", async () => {
    const r = await round([{ "0-0": 0 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });
});

describe("round — direct call: with explicit n", () => {
  it("n=2: 3.14159 → 3.14", async () => {
    const r = await round([{ "0-0": 3.14159 }, { "0-0": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(3.14, 6);
  });

  it("n=2: -2.567 → -2.57", async () => {
    const r = await round([{ "0-0": -2.567 }, { "0-0": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-2.57, 6);
  });

  it("n=3: 1.23456 → 1.235", async () => {
    const r = await round([{ "0-0": 1.23456 }, { "0-0": 3 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1.235, 6);
  });

  it("n=-1: 15 → 20 (round to nearest 10)", async () => {
    const r = await round([{ "0-0": 15 }, { "0-0": -1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(20, 6);
  });

  it("n=-1: 14 → 10 (round to nearest 10)", async () => {
    const r = await round([{ "0-0": 14 }, { "0-0": -1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(10, 6);
  });
});

describe("round — direct call: vectors", () => {
  it("row vector, n=0 → element-wise round", async () => {
    const mat = { "0-0": 1.4, "0-1": 2.6, "0-2": -1.5, "0-3": 0.0 };
    const r = await round([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
    expect(r["0-1"]).toBeCloseTo(3, 10);
    expect(r["0-2"]).toBeCloseTo(-1, 10); // -1.5 → -1 in JS (rounds toward +Infinity)
    expect(r["0-3"]).toBeCloseTo(0, 10);
  });

  it("row vector, n=1 → round to 1 decimal", async () => {
    const mat = { "0-0": 1.15, "0-1": 2.25, "0-2": 3.35 };
    const r = await round([mat, { "0-0": 1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1.2, 4);
    expect(r["0-1"]).toBeCloseTo(2.3, 4);
    expect(r["0-2"]).toBeCloseTo(3.4, 4);
  });
});

describe("round — direct call: 2D matrix", () => {
  it("2x2 matrix, n=0 → element-wise round", async () => {
    const mat = { "0-0": 1.4, "0-1": 2.6, "1-0": -3.5, "1-1": 4.1 };
    const r = await round([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
    expect(r["0-1"]).toBeCloseTo(3, 10);
    expect(r["1-0"]).toBeCloseTo(-3, 10); // -3.5 → -3 in JS
    expect(r["1-1"]).toBeCloseTo(4, 10);
  });

  it("3x3 matrix, n=2 → round to 2 decimals", async () => {
    const mat = {
      "0-0": 1.111, "0-1": 2.225, "0-2": 3.999,
      "1-0": -1.005, "1-1": 0.0049, "1-2": 9.995,
      "2-0": 4.444, "2-1": 5.556, "2-2": 6.667,
    };
    const r = await round([mat, { "0-0": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1.11, 4);
    expect(r["0-1"]).toBeCloseTo(2.23, 4);
    expect(r["0-2"]).toBeCloseTo(4.0, 4);
    expect(r["2-0"]).toBeCloseTo(4.44, 4);
    expect(r["2-1"]).toBeCloseTo(5.56, 4);
    expect(r["2-2"]).toBeCloseTo(6.67, 4);
  });
});

describe("round — direct call: edge cases", () => {
  it("empty matrix → empty result", async () => {
    const r = await round([{}], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(0);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("round — pipeline: scalars", () => {
  it("x = round(3.4) → 3", async () => {
    const r = await runPipeline(ctx("x = round(3.4)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(3, 4);
  });

  it("x = round(3.5) → 4", async () => {
    const r = await runPipeline(ctx("x = round(3.5)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(4, 4);
  });

  it("x = round(3.9) → 4", async () => {
    const r = await runPipeline(ctx("x = round(3.9)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(4, 4);
  });

  it("x = round(-3.6) → -4", async () => {
    const r = await runPipeline(ctx("x = round(-3.6)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(-4, 4);
  });

  it("x = round(3.14159, 2) → 3.14", async () => {
    const r = await runPipeline(ctx("x = round(3.14159, 2)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(3.14, 4);
  });
});

describe("round — pipeline: vector via documentEquations", () => {
  it("round(v) on [1.4, 2.6, 3.5, 4.1] → [1, 3, 4, 4]", async () => {
    const vals = [1.4, 2.6, 3.5, 4.1];
    const expected = [1, 3, 4, 4];
    const c = ctx("y = round(v)");
    c.documentEquations = [makeVec("v", vals, -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(Object.keys(r.solution.real)).toHaveLength(vals.length);
    expected.forEach((v, i) => {
      expect(r.solution.real[`0-${i}`]).toBeCloseTo(v, 4);
    });
  });
});

describe("round — pipeline: inline 2D matrix", () => {
  it("round([1.4,2.6;3.5,4.1]) → [[1,3],[4,4]]", async () => {
    const r = await runPipeline(ctx("y = round([1.4,2.6;3.5,4.1])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(3, 4);
    expect(r.solution.real["1-0"]).toBeCloseTo(4, 4);
    expect(r.solution.real["1-1"]).toBeCloseTo(4, 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────

const FT_M = 0.3048;
const IN_M = 0.0254;
const LB_KG = 0.45359237;

async function solveWith(varVal: string, varUnit: string, fnExpr: string) {
  const blocks: OrderedBlock[] = [
    { id: "vb", order: 1, type: "EQUATION", definition: { raw: `v = ${varVal}`, variableName: "v", unit: varUnit } },
    { id: "xb", order: 2, type: "EQUATION", definition: { raw: `x = ${fnExpr}`, variableName: "x", unit: "" } },
  ];
  const r1 = await solveDocument(blocks, "vb", []);
  const r2 = await solveDocument(blocks, "xb", r1.resolvedMap);
  return r2.results.find((r) => r.blockId === "xb")!;
}

describe("round — simple units (m)", () => {
  it("round(3.7 m) → 4 m", async () => {
    const r = await solveWith("3.7", "m", "round(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(4, 4);
  });

  it("round(-3.1 m) → -3 m", async () => {
    const r = await solveWith("-3.1", "m", "round(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(-3, 4);
  });

  it("round(5 m) → 5 m (exact integer)", async () => {
    const r = await solveWith("5", "m", "round(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(5, 4);
  });
});

describe("round — compound units (m/s)", () => {
  it("round(2.7 m/s) → 3 m/s", async () => {
    const r = await solveWith("2.7", "m/s", "round(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(3, 4);
  });

  it("round(-3.4 m/s) → -3 m/s", async () => {
    const r = await solveWith("-3.4", "m/s", "round(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(-3, 4);
  });
});

describe("round — converted units (ft, in, lb)", () => {
  it("round(4.5ft) → round(4.5 × 0.3048) = 1", async () => {
    const r = await runPipeline(ctx("x = round(4.5ft)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.round(4.5 * FT_M), 4);
  });

  it("round(60in) → round(60 × 0.0254) = 2", async () => {
    const r = await runPipeline(ctx("x = round(60in)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.round(60 * IN_M), 4);
  });

  it("round(2.5lb) → round(2.5 × 0.4536) = 1", async () => {
    const r = await runPipeline(ctx("x = round(2.5lb)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.round(2.5 * LB_KG), 4);
  });
});
