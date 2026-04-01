/**
 * Tests for sign() — solver/functions/basic/sign.ts
 *
 * Uses elementwise(args[0], Math.sign).
 * Returns 1 for positive, -1 for negative, 0 for zero.
 *
 * Direct-call tests:
 *   - Positive scalar → 1
 *   - Negative scalar → -1
 *   - Zero → 0
 *   - Positive float → 1
 *   - Negative float → -1
 *   - Row vector → element-wise signs
 *   - 2D matrix → element-wise signs
 *   - Empty matrix → empty
 *
 * Pipeline tests:
 *   - x = sign(5) → 1
 *   - x = sign(-5) → -1
 *   - x = sign(0) → 0
 *   - x = sign(0.001) → 1
 *   - x = sign(-0.001) → -1
 *   - Vector via documentEquations → element-wise signs
 *   - Inline 2D matrix literal → element-wise signs
 */

import { describe, it, expect } from "vitest";
import { sign } from "../../functions/basic/sign";
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

describe("sign — direct call: scalars", () => {
  it("positive integer → 1", async () => {
    const r = await sign([{ "0-0": 5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
  });

  it("negative integer → -1", async () => {
    const r = await sign([{ "0-0": -5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-1, 10);
  });

  it("zero → 0", async () => {
    const r = await sign([{ "0-0": 0 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });

  it("positive float → 1", async () => {
    const r = await sign([{ "0-0": 0.001 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
  });

  it("negative float → -1", async () => {
    const r = await sign([{ "0-0": -0.001 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-1, 10);
  });

  it("large positive → 1", async () => {
    const r = await sign([{ "0-0": 1e10 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
  });

  it("large negative → -1", async () => {
    const r = await sign([{ "0-0": -1e10 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-1, 10);
  });
});

describe("sign — direct call: vectors", () => {
  it("row vector [-3, 0, 5] → [-1, 0, 1]", async () => {
    const mat = { "0-0": -3, "0-1": 0, "0-2": 5 };
    const r = await sign([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-1, 10);
    expect(r["0-1"]).toBeCloseTo(0, 10);
    expect(r["0-2"]).toBeCloseTo(1, 10);
  });

  it("all positive values → all 1", async () => {
    const mat = { "0-0": 1, "0-1": 10, "0-2": 0.5, "0-3": 100 };
    const r = await sign([mat], ctx("x=0"));
    Object.values(r).forEach(v => expect(v).toBeCloseTo(1, 10));
  });

  it("all negative values → all -1", async () => {
    const mat = { "0-0": -1, "0-1": -10, "0-2": -0.5, "0-3": -100 };
    const r = await sign([mat], ctx("x=0"));
    Object.values(r).forEach(v => expect(v).toBeCloseTo(-1, 10));
  });
});

describe("sign — direct call: 2D matrix", () => {
  it("2x2 matrix → element-wise signs", async () => {
    const mat = { "0-0": -1, "0-1": 0, "1-0": 2, "1-1": -3 };
    const r = await sign([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-1, 10);
    expect(r["0-1"]).toBeCloseTo(0, 10);
    expect(r["1-0"]).toBeCloseTo(1, 10);
    expect(r["1-1"]).toBeCloseTo(-1, 10);
  });

  it("3x3 matrix with mixed values", async () => {
    const mat = {
      "0-0": 5,  "0-1": -3, "0-2": 0,
      "1-0": -7, "1-1": 2,  "1-2": -1,
      "2-0": 0,  "2-1": 4,  "2-2": -9,
    };
    const r = await sign([mat], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1,  10);
    expect(r["0-1"]).toBeCloseTo(-1, 10);
    expect(r["0-2"]).toBeCloseTo(0,  10);
    expect(r["1-0"]).toBeCloseTo(-1, 10);
    expect(r["1-1"]).toBeCloseTo(1,  10);
    expect(r["1-2"]).toBeCloseTo(-1, 10);
    expect(r["2-0"]).toBeCloseTo(0,  10);
    expect(r["2-1"]).toBeCloseTo(1,  10);
    expect(r["2-2"]).toBeCloseTo(-1, 10);
  });
});

describe("sign — direct call: edge cases", () => {
  it("empty matrix → empty result", async () => {
    const r = await sign([{}], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(0);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("sign — pipeline: scalars", () => {
  it("x = sign(5) → 1", async () => {
    const r = await runPipeline(ctx("x = sign(5)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
  });

  it("x = sign(-5) → -1", async () => {
    const r = await runPipeline(ctx("x = sign(-5)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(-1, 4);
  });

  it("x = sign(0) → 0", async () => {
    const r = await runPipeline(ctx("x = sign(0)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });

  it("x = sign(0.001) → 1", async () => {
    const r = await runPipeline(ctx("x = sign(0.001)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
  });

  it("x = sign(-0.001) → -1", async () => {
    const r = await runPipeline(ctx("x = sign(-0.001)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(-1, 4);
  });
});

describe("sign — pipeline: vector via documentEquations", () => {
  it("sign(v) on [-3, 0, 5] → [-1, 0, 1]", async () => {
    const vals = [-3, 0, 5];
    const c = ctx("y = sign(v)");
    c.documentEquations = [makeVec("v", vals, -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(Object.keys(r.solution.real)).toHaveLength(vals.length);
    expect(r.solution.real["0-0"]).toBeCloseTo(-1, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(0, 4);
    expect(r.solution.real["0-2"]).toBeCloseTo(1, 4);
  });

  it("sign(v) on 5-element vector → correct signs", async () => {
    const vals = [2, -4, 0, 7, -1];
    const expected = [1, -1, 0, 1, -1];
    const c = ctx("y = sign(v)");
    c.documentEquations = [makeVec("v", vals, -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expected.forEach((v, i) => {
      expect(r.solution.real[`0-${i}`]).toBeCloseTo(v, 4);
    });
  });
});

describe("sign — pipeline: inline 2D matrix", () => {
  it("sign([-1,0;2,-3]) → [[-1,0],[1,-1]]", async () => {
    const r = await runPipeline(ctx("y = sign([-1,0;2,-3])"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(-1, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(0, 4);
    expect(r.solution.real["1-0"]).toBeCloseTo(1, 4);
    expect(r.solution.real["1-1"]).toBeCloseTo(-1, 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────
// sign() returns -1, 0, or 1 — result is dimensionless regardless of input units.

async function solveWith(varVal: string, varUnit: string, fnExpr: string) {
  const blocks: OrderedBlock[] = [
    { id: "vb", order: 1, type: "EQUATION", definition: { raw: `v = ${varVal}`, variableName: "v", unit: varUnit } },
    { id: "xb", order: 2, type: "EQUATION", definition: { raw: `x = ${fnExpr}`, variableName: "x", unit: "" } },
  ];
  const r1 = await solveDocument(blocks, "vb", []);
  const r2 = await solveDocument(blocks, "xb", r1.resolvedMap);
  return r2.results.find((r) => r.blockId === "xb")!;
}

describe("sign — simple units (m): result is dimensionless", () => {
  it("sign(-5 m) → -1", async () => {
    const r = await solveWith("-5", "m", "sign(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(-1, 4);
  });

  it("sign(3.7 m) → 1", async () => {
    const r = await solveWith("3.7", "m", "sign(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(1, 4);
  });

  it("sign(0 m) → 0", async () => {
    const r = await solveWith("0", "m", "sign(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(0, 4);
  });
});

describe("sign — compound units (N*m, m/s): result is dimensionless", () => {
  it("sign(-3.5 N*m) → -1", async () => {
    const r = await solveWith("-3.5", "N*m", "sign(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(-1, 4);
  });

  it("sign(5 m/s) → 1", async () => {
    const r = await solveWith("5", "m/s", "sign(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(1, 4);
  });
});

describe("sign — converted units (ft, in, lb): result is dimensionless", () => {
  it("sign(-5 ft) → -1", async () => {
    const r = await solveWith("-5", "ft", "sign(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(-1, 4);
  });

  it("sign(12 in) → 1", async () => {
    const r = await solveWith("12", "in", "sign(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(1, 4);
  });

  it("sign(-3 lb) → -1", async () => {
    const r = await solveWith("-3", "lb", "sign(v)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(-1, 4);
  });
});
