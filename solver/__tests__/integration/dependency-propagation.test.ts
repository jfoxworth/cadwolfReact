/**
 * Integration tests: dependency propagation
 *
 * Verifies that solveDocument() correctly re-solves all dependent equations
 * when a slider, dropdown, or select block changes — including:
 *   Phase 1: downstream blocks (order >= changed block)
 *   Phase 2: upstream blocks that reference newly-solved variables
 *   Loops/if-else: solver-level correctness and integration with synthetic final-value blocks
 */

import { describe, it, expect } from "vitest";
import { solveDocument, solveLoop, solveWhileLoop, solveIfElse } from "../../worker/document-solver";
import type { OrderedBlock, ResolvedEquation } from "../../types";
import type { ParentEquation, SolveIfElseBranch } from "../../worker/worker-types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const EMPTY_BASE: [number,number,number,number,number,number,number,number] = [0,0,0,0,0,0,0,0];

function slider(id: string, order: number, name: string, value: number): OrderedBlock {
  return { id, order, type: "SLIDER", definition: { raw: `${name} = ${value}`, variableName: name } };
}

function dropdown(id: string, order: number, name: string, selectedValue: string): OrderedBlock {
  return { id, order, type: "DROPDOWN", definition: { raw: `${name} = ${selectedValue}`, variableName: name } };
}

function selectBlock(id: string, order: number, name: string, selectedValue: string): OrderedBlock {
  return { id, order, type: "SELECT_BLOCK", definition: { raw: `${name} = ${selectedValue}`, variableName: name } };
}

function eq(id: string, order: number, raw: string): OrderedBlock {
  return { id, order, type: "EQUATION", definition: { raw } };
}

/** Synthetic final-value block — mirrors what buildSolverBlocks emits after a loop runs. */
function finalValue(loopId: string, order: number, varName: string, val: number): OrderedBlock {
  return { id: `${loopId}:final:${varName}`, order, type: "EQUATION", definition: { raw: `${varName} = ${val}` } };
}

function parentCtx(id: string, name: string, value: number): ParentEquation {
  return {
    blockId: id,
    variableName: name,
    solution: { real: { "0-0": value }, imag: { "0-0": 0 }, size: "1x1", units: "", baseUnits: EMPTY_BASE, multiplier: 1 },
  };
}

function resolved(id: string, order: number, name: string, value: number): ResolvedEquation {
  return {
    blockId: id,
    order,
    variableName: name,
    solution: { real: { "0-0": value }, imag: { "0-0": 0 }, size: "1x1", units: "", baseUnits: EMPTY_BASE, multiplier: 1 },
    error: null,
  };
}

// ─── Group 1: Slider Phase 1 (changed block upstream of dependents) ──────────

describe("Group 1 — Slider: Phase 1 upstream changes", () => {
  const blocks = [
    slider("a", 1, "a", 2),
    slider("b", 2, "b", 3),
    slider("c", 3, "c", 4),
    eq("result", 4, "result = a + b + c"),
  ];

  it("1a: changing a re-solves result with new a value", async () => {
    const newBlocks = blocks.map((b) => b.id === "a" ? slider("a", 1, "a", 10) : b);
    const preResolved = [resolved("b", 2, "b", 3), resolved("c", 3, "c", 4)];
    const { results } = await solveDocument(newBlocks, "a", preResolved);
    const r = results.find((r) => r.blockId === "result");
    expect(r).toBeDefined();
    expect(r?.errors).toHaveLength(0);
    expect(r?.solution?.real["0-0"]).toBeCloseTo(10 + 3 + 4); // 17
  });

  it("1b: changing c re-solves result with new c value", async () => {
    const newBlocks = blocks.map((b) => b.id === "c" ? slider("c", 3, "c", 20) : b);
    const preResolved = [resolved("a", 1, "a", 2), resolved("b", 2, "b", 3)];
    const { results } = await solveDocument(newBlocks, "c", preResolved);
    const r = results.find((r) => r.blockId === "result");
    expect(r).toBeDefined();
    expect(r?.errors).toHaveLength(0);
    expect(r?.solution?.real["0-0"]).toBeCloseTo(2 + 3 + 20); // 25
  });

  it("1c: changing c when a and b are not yet in resolvedMap — bootstraps priors correctly", async () => {
    const newBlocks = blocks.map((b) => b.id === "c" ? slider("c", 3, "c", 5) : b);
    // resolvedMap is empty — first-ever change
    const { results } = await solveDocument(newBlocks, "c", []);
    const r = results.find((r) => r.blockId === "result");
    expect(r).toBeDefined();
    expect(r?.errors).toHaveLength(0);
    // a=2, b=3 from block definitions, c=5 from new slider value
    expect(r?.solution?.real["0-0"]).toBeCloseTo(2 + 3 + 5); // 10
  });
});

// ─── Group 2: Slider Phase 2 (equation ABOVE the changed slider) ─────────────

describe("Group 2 — Slider: Phase 2 equation above changed slider", () => {
  const blocks = [
    eq("result", 1, "result = a + b + c"),
    slider("a", 2, "a", 2),
    slider("b", 3, "b", 3),
    slider("c", 4, "c", 4),
  ];

  it("2a: changing a — Phase 2 catches result", async () => {
    const newBlocks = blocks.map((b) => b.id === "a" ? slider("a", 2, "a", 10) : b);
    const preResolved = [resolved("b", 3, "b", 3), resolved("c", 4, "c", 4)];
    const { results } = await solveDocument(newBlocks, "a", preResolved);
    const r = results.find((r) => r.blockId === "result");
    expect(r).toBeDefined();
    expect(r?.errors).toHaveLength(0);
    expect(r?.solution?.real["0-0"]).toBeCloseTo(10 + 3 + 4); // 17
  });

  it("2b: changing c (lowest, order 4) — Phase 2 catches result", async () => {
    const newBlocks = blocks.map((b) => b.id === "c" ? slider("c", 4, "c", 20) : b);
    const preResolved = [resolved("a", 2, "a", 2), resolved("b", 3, "b", 3)];
    const { results } = await solveDocument(newBlocks, "c", preResolved);
    const r = results.find((r) => r.blockId === "result");
    expect(r).toBeDefined();
    expect(r?.errors).toHaveLength(0);
    expect(r?.solution?.real["0-0"]).toBeCloseTo(2 + 3 + 20); // 25
  });

  it("2c: second change of c (resolvedMap populated) — still re-solves correctly", async () => {
    // First change populates resolvedMap
    const blocks1 = blocks.map((b) => b.id === "c" ? slider("c", 4, "c", 7) : b);
    const r1 = await solveDocument(blocks1, "c", []);

    // Second change
    const blocks2 = blocks1.map((b) => b.id === "c" ? slider("c", 4, "c", 9) : b);
    const { results } = await solveDocument(blocks2, "c", r1.resolvedMap);
    const r = results.find((r) => r.blockId === "result");
    expect(r).toBeDefined();
    expect(r?.solution?.real["0-0"]).toBeCloseTo(2 + 3 + 9); // 14
  });
});

// ─── Group 3: Dropdown inputs ─────────────────────────────────────────────────

describe("Group 3 — Dropdown inputs", () => {
  it("3a: selecting value 2 → result = 20", async () => {
    const blocks = [
      dropdown("dropInput", 1, "dropVal", "2"),
      eq("result", 2, "result = dropVal * 10"),
    ];
    const { results } = await solveDocument(blocks, "dropInput", []);
    const r = results.find((r) => r.blockId === "result");
    expect(r?.errors).toHaveLength(0);
    expect(r?.solution?.real["0-0"]).toBeCloseTo(20);
  });

  it("3b: dropdown ABOVE equation (Phase 2) — result re-solved", async () => {
    const blocks = [
      eq("result", 1, "result = dropVal * 10"),
      dropdown("dropInput", 2, "dropVal", "3"),
    ];
    const { results } = await solveDocument(blocks, "dropInput", []);
    const r = results.find((r) => r.blockId === "result");
    expect(r?.errors).toHaveLength(0);
    expect(r?.solution?.real["0-0"]).toBeCloseTo(30);
  });
});

// ─── Group 4: SELECT_BLOCK inputs ────────────────────────────────────────────

describe("Group 4 — SELECT_BLOCK inputs", () => {
  it("4a: select value 2.0 → output = base * 2.0", async () => {
    const blocks = [
      slider("base", 1, "base", 5),
      selectBlock("factor", 2, "factor", "2.0"),
      eq("output", 3, "output = base * factor"),
    ];
    const { results } = await solveDocument(blocks, "factor", []);
    const r = results.find((r) => r.blockId === "output");
    expect(r?.errors).toHaveLength(0);
    expect(r?.solution?.real["0-0"]).toBeCloseTo(10);
  });

  it("4b: changing slider base with select factor present — output updates", async () => {
    const blocks = [
      slider("base", 1, "base", 7),
      selectBlock("factor", 2, "factor", "3.0"),
      eq("output", 3, "output = base * factor"),
    ];
    const preResolved = [resolved("factor", 2, "factor", 3.0)];
    const { results } = await solveDocument(blocks, "base", preResolved);
    const r = results.find((r) => r.blockId === "output");
    expect(r?.errors).toHaveLength(0);
    expect(r?.solution?.real["0-0"]).toBeCloseTo(21);
  });
});

// ─── Group 5: Chained dependencies ───────────────────────────────────────────

describe("Group 5 — Chained dependencies", () => {
  const blocks = [
    eq("a", 1, "a = 5"),
    eq("b", 2, "b = a * 2"),
    eq("c", 3, "c = b + 1"),
    eq("result", 4, "result = c * 10"),
  ];

  it("5a: changing a re-solves all of b, c, result", async () => {
    const newBlocks = blocks.map((b) => b.id === "a" ? eq("a", 1, "a = 8") : b);
    const { results } = await solveDocument(newBlocks, "a", []);
    expect(results.map((r) => r.blockId)).toContain("b");
    expect(results.map((r) => r.blockId)).toContain("c");
    expect(results.map((r) => r.blockId)).toContain("result");
  });

  it("5b: result = (a*2 + 1) * 10 with a=8 → 170", async () => {
    const newBlocks = blocks.map((b) => b.id === "a" ? eq("a", 1, "a = 8") : b);
    const { results } = await solveDocument(newBlocks, "a", []);
    const r = results.find((r) => r.blockId === "result");
    expect(r?.errors).toHaveLength(0);
    expect(r?.solution?.real["0-0"]).toBeCloseTo(170); // (8*2+1)*10
  });
});

// ─── Group 6: Plot variable coverage (all 10 plot types) ─────────────────────

describe("Group 6 — Plot variable coverage", () => {
  // Line / Area / Scatter: x-vector and y-vector updated when multiplier changes
  for (const plotType of ["line", "area", "scatter"] as const) {
    it(`6 ${plotType}: yVals re-solved when multiplier changes`, async () => {
      const blocks = [
        slider("mult", 1, "mult", 2),
        // Use mult directly inside linspace to avoid matrix-scalar * issues
        eq("yVals", 2, "yVals = linspace(0, mult * 10, 5)"),
      ];
      const newBlocks = blocks.map((b) => b.id === "mult" ? slider("mult", 1, "mult", 3) : b);
      const { results } = await solveDocument(newBlocks, "mult", []);
      const yR = results.find((r) => r.blockId === "yVals");
      expect(yR?.errors).toHaveLength(0);
      expect(yR?.solution?.size).not.toBe("1x1"); // vector, not scalar
      // linspace(0, 3*10, 5) = [0, 7.5, 15, 22.5, 30]
      expect(yR?.solution?.real["0-1"]).toBeCloseTo(7.5);
    });
  }

  // Bar: values vector re-solved
  it("6 bar: values vector re-solved when multiplier changes", async () => {
    const blocks = [
      slider("scale", 1, "scale", 2),
      // linspace endpoints scale with scale to avoid matrix * scalar issues
      eq("barVals", 2, "barVals = linspace(scale, scale * 5, 5)"),
    ];
    const newBlocks = blocks.map((b) => b.id === "scale" ? slider("scale", 1, "scale", 3) : b);
    const { results } = await solveDocument(newBlocks, "scale", []);
    const r = results.find((r) => r.blockId === "barVals");
    expect(r?.errors).toHaveLength(0);
    // linspace(3, 15, 5) = [3, 6, 9, 12, 15]
    expect(r?.solution?.real["0-0"]).toBeCloseTo(3);
    expect(r?.solution?.real["0-4"]).toBeCloseTo(15);
  });

  // Combo: line series + bar series both update
  it("6 combo: both line and bar series vars re-solved", async () => {
    const blocks = [
      slider("mult", 1, "mult", 2),
      eq("lineY", 2, "lineY = linspace(0, mult * 4, 5)"),
      eq("barY", 3, "barY = linspace(0, mult * 8, 5)"),
    ];
    const newBlocks = blocks.map((b) => b.id === "mult" ? slider("mult", 1, "mult", 5) : b);
    const { results } = await solveDocument(newBlocks, "mult", []);
    expect(results.find((r) => r.blockId === "lineY")).toBeDefined();
    expect(results.find((r) => r.blockId === "barY")).toBeDefined();
    const barR = results.find((r) => r.blockId === "barY");
    // linspace(0, 5*8, 5)[4] = 40
    expect(barR?.solution?.real["0-4"]).toBeCloseTo(40);
  });

  // Bubble: x, y, size all update
  it("6 bubble: xVals, yVals, sizeVals all re-solved", async () => {
    const blocks = [
      slider("k", 1, "k", 2),
      eq("bx", 2, "bx = linspace(1, 5, 5)"),
      eq("by", 3, "by = linspace(k, k * 5, 5)"),
      eq("bs", 4, "bs = linspace(k * 0.5, k * 2.5, 5)"),
    ];
    const newBlocks = blocks.map((b) => b.id === "k" ? slider("k", 1, "k", 3) : b);
    const { results } = await solveDocument(newBlocks, "k", []);
    expect(results.find((r) => r.blockId === "by")).toBeDefined();
    expect(results.find((r) => r.blockId === "bs")).toBeDefined();
    const byR = results.find((r) => r.blockId === "by");
    // linspace(3, 15, 5)[0] = 3
    expect(byR?.solution?.real["0-0"]).toBeCloseTo(3);
  });

  // Heatmap: downstream equation re-solved when scalar input changes
  it("6 heatmap: Z equation re-solved when fill changes", async () => {
    const blocks = [
      slider("fill", 1, "fill", 5),
      // Use fill as endpoint to avoid matrix * scalar multiplication issues
      eq("Z", 2, "Z = linspace(0, fill, 5)"),
    ];
    const newBlocks = blocks.map((b) => b.id === "fill" ? slider("fill", 1, "fill", 9) : b);
    const { results } = await solveDocument(newBlocks, "fill", []);
    const zR = results.find((r) => r.blockId === "Z");
    expect(zR?.errors).toHaveLength(0);
    // linspace(0, 9, 5)[4] = 9
    expect(zR?.solution?.real["0-4"]).toBeCloseTo(9);
  });

  // Surface: downstream equation re-solved when scalar changes
  it("6 surface: surfZ equation re-solved when amp changes", async () => {
    const blocks = [
      slider("amp", 1, "amp", 1),
      eq("surfZ", 2, "surfZ = linspace(0, amp, 5)"),
    ];
    const newBlocks = blocks.map((b) => b.id === "amp" ? slider("amp", 1, "amp", 7) : b);
    const { results } = await solveDocument(newBlocks, "amp", []);
    const r = results.find((r) => r.blockId === "surfZ");
    expect(r?.errors).toHaveLength(0);
    // linspace(0, 7, 5)[4] = 7
    expect(r?.solution?.real["0-4"]).toBeCloseTo(7);
  });

  // Pie: 1D values vector re-solved
  it("6 pie: values vector re-solved when scalar changes", async () => {
    const blocks = [
      slider("base", 1, "base", 10),
      eq("pieVals", 2, "pieVals = linspace(base, base * 3, 4)"),
    ];
    const newBlocks = blocks.map((b) => b.id === "base" ? slider("base", 1, "base", 20) : b);
    const { results } = await solveDocument(newBlocks, "base", []);
    const r = results.find((r) => r.blockId === "pieVals");
    expect(r?.errors).toHaveLength(0);
    // linspace(20, 60, 4)[0] = 20
    expect(r?.solution?.real["0-0"]).toBeCloseTo(20);
  });

  // Donut: same as pie
  it("6 donut: values vector re-solved when scalar changes (same as pie)", async () => {
    const blocks = [
      slider("base", 1, "base", 5),
      eq("donutVals", 2, "donutVals = linspace(base, base * 4, 4)"),
    ];
    const newBlocks = blocks.map((b) => b.id === "base" ? slider("base", 1, "base", 10) : b);
    const { results } = await solveDocument(newBlocks, "base", []);
    const r = results.find((r) => r.blockId === "donutVals");
    expect(r?.errors).toHaveLength(0);
    expect(r?.solution?.real["0-0"]).toBeCloseTo(10);
  });
});

// ─── Group 7: For Loop solver-level correctness ───────────────────────────────

describe("Group 7 — For Loop: solver-level correctness", () => {
  it("7a: i from 1 to 4, val = i * 2 computed per iteration, last = 6", async () => {
    const childBlocks: OrderedBlock[] = [
      eq("val", 1, "val = i * 2"),
    ];
    const iterations = await solveLoop("i", 1, 4, 1, childBlocks, []);
    expect(iterations).toHaveLength(3); // i = 1, 2, 3 (i < 4)
    const last = iterations[iterations.length - 1]; // i=3
    const valResult = last.childResults.find((r) => r.variableName === "val");
    expect(valResult?.solution?.real["0-0"]).toBeCloseTo(6); // 3 * 2
  });

  it("7b: parent scale=2, child val = i * scale → last val = 3 * 2 = 6", async () => {
    const childBlocks: OrderedBlock[] = [eq("val", 1, "val = i * scale")];
    const parent = [parentCtx("p1", "scale", 2)];
    const iterations = await solveLoop("i", 1, 4, 1, childBlocks, parent);
    const last = iterations[iterations.length - 1]; // i=3
    const valR = last.childResults.find((r) => r.variableName === "val");
    expect(valR?.solution?.real["0-0"]).toBeCloseTo(6);
  });

  it("7c: change scale to 3 → last val = 3 * 3 = 9", async () => {
    const childBlocks: OrderedBlock[] = [eq("val", 1, "val = i * scale")];
    const parent = [parentCtx("p1", "scale", 3)];
    const iterations = await solveLoop("i", 1, 4, 1, childBlocks, parent);
    const last = iterations[iterations.length - 1];
    const valR = last.childResults.find((r) => r.variableName === "val");
    expect(valR?.solution?.real["0-0"]).toBeCloseTo(9);
  });

  it("7d: final values → synthetic block → downstream equation resolves", async () => {
    // Simulate: loop ran and produced finalValue total=6; synthetic block exposes it
    const blocks = [
      finalValue("loop1", 2, "total", 6),
      eq("result", 3, "result = total * 2"),
    ];
    const { results } = await solveDocument(blocks, "loop1:final:total", []);
    const r = results.find((r) => r.blockId === "result");
    expect(r?.errors).toHaveLength(0);
    expect(r?.solution?.real["0-0"]).toBeCloseTo(12);
  });
});

// ─── Group 8: While Loop solver-level correctness ─────────────────────────────

describe("Group 8 — While Loop: solver-level correctness", () => {
  it("8a: x < 5, x = x + 1, start x=0 → terminates with 5 iterations, x=5", async () => {
    const childBlocks: OrderedBlock[] = [
      eq("x", 1, "x = x + 1"),
    ];
    const parent = [parentCtx("p0", "x", 0)];
    const { iterations, finalValues } = await solveWhileLoop("x", "<", "5", 100, childBlocks, parent);
    expect(iterations).toHaveLength(5);
    expect(finalValues["x"]).toBeCloseTo(5);
  });

  it("8b: parent step=2, x = x + step → terminates faster", async () => {
    const childBlocks: OrderedBlock[] = [eq("x", 1, "x = x + step")];
    const parent = [parentCtx("p0", "x", 0), parentCtx("p1", "step", 2)];
    const { iterations, finalValues } = await solveWhileLoop("x", "<", "10", 100, childBlocks, parent);
    // 0,2,4,6,8 → stops when x=10
    expect(iterations).toHaveLength(5);
    expect(finalValues["x"]).toBeCloseTo(10);
  });

  it("8c: change step to 1 → more iterations", async () => {
    const childBlocks: OrderedBlock[] = [eq("x", 1, "x = x + step")];
    const parent = [parentCtx("p0", "x", 0), parentCtx("p1", "step", 1)];
    const { iterations } = await solveWhileLoop("x", "<", "10", 100, childBlocks, parent);
    expect(iterations).toHaveLength(10);
  });

  it("8d: finalValues.x → synthetic block → downstream result = x * 10", async () => {
    const blocks = [
      finalValue("wloop1", 2, "x", 5),
      eq("result", 3, "result = x * 10"),
    ];
    const { results } = await solveDocument(blocks, "wloop1:final:x", []);
    const r = results.find((r) => r.blockId === "result");
    expect(r?.errors).toHaveLength(0);
    expect(r?.solution?.real["0-0"]).toBeCloseTo(50);
  });
});

// ─── Group 9: If/Else solver-level correctness ───────────────────────────────

describe("Group 9 — If/Else: solver-level correctness", () => {
  const ifBranch: SolveIfElseBranch = {
    type: "if",
    conditions: [{ flagText: "a", conditionText: ">", dependentText: "5", blockOption: "&&" }],
    childBlocks: [eq("output", 1, "output = 100")],
  };
  const elseBranch: SolveIfElseBranch = {
    type: "else",
    conditions: [],
    childBlocks: [eq("output", 1, "output = 0")],
  };

  it("9a: a=10 → if branch active, output=100", async () => {
    const parent = [parentCtx("pa", "a", 10)];
    const { activeBranchIndex, childResults } = await solveIfElse([ifBranch, elseBranch], parent, 2);
    expect(activeBranchIndex).toBe(0);
    const r = childResults.find((r) => r.variableName === "output");
    expect(r?.solution?.real["0-0"]).toBeCloseTo(100);
  });

  it("9b: a=3 → else branch active, output=0", async () => {
    const parent = [parentCtx("pa", "a", 3)];
    const { activeBranchIndex, childResults } = await solveIfElse([ifBranch, elseBranch], parent, 2);
    expect(activeBranchIndex).toBe(1);
    const r = childResults.find((r) => r.variableName === "output");
    expect(r?.solution?.real["0-0"]).toBeCloseTo(0);
  });

  it("9c: finalValues.output → synthetic block → downstream result = output + 1", async () => {
    const blocks = [
      finalValue("ifelse1", 2, "output", 100),
      eq("result", 3, "result = output + 1"),
    ];
    const { results } = await solveDocument(blocks, "ifelse1:final:output", []);
    const r = results.find((r) => r.blockId === "result");
    expect(r?.errors).toHaveLength(0);
    expect(r?.solution?.real["0-0"]).toBeCloseTo(101);
  });
});
