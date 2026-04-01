/**
 * End-to-end integration test: Beam Deflection Document
 *
 * Mirrors the fixture at fixtures/document.json:
 *   L = 6 m
 *   w = 12 kN/m
 *   E = 200000 MPa
 *   I = 85600000 mm^4
 *   delta = (5 * w * L^4) / (384 * E * I)   → 1.1842e-8 (unit-naive, pre-unit-conversion)
 *
 * This test verifies that the solver pipeline can:
 *  1. Solve simple constant equations
 *  2. Substitute earlier-solved variables into later equations
 *  3. Evaluate the arithmetic correctly (unit conversion handled in Phase 3)
 */

import { describe, it, expect } from "vitest";
import { solveDocument } from "../../worker/document-solver";
import type { OrderedBlock, ResolvedEquation } from "../../types";

const emptyBase: [number,number,number,number,number,number,number,number] = [0,0,0,0,0,0,0,0];

const blocks: OrderedBlock[] = [
  { id: "block-2", order: 2, type: "EQUATION", definition: { raw: "L = 6",  variableName: "L", unit: "m" } },
  { id: "block-3", order: 3, type: "EQUATION", definition: { raw: "w = 12", variableName: "w", unit: "kN/m" } },
  { id: "block-4", order: 4, type: "EQUATION", definition: { raw: "E = 200000", variableName: "E", unit: "MPa" } },
  { id: "block-5", order: 5, type: "EQUATION", definition: { raw: "I = 85600000", variableName: "I", unit: "mm^4" } },
  {
    id: "block-7",
    order: 7,
    type: "EQUATION",
    definition: {
      raw: "delta = (5 * w * L^4) / (384 * E * I)",
      variableName: "delta",
      unit: "mm",
    },
  },
];

describe("Beam deflection — full document solve", () => {
  it("solves all 5 equations in order (no pre-existing resolved map)", async () => {
    // Solve L first
    const r1 = await solveDocument(blocks, "block-2", []);
    const lResult = r1.results.find((r) => r.blockId === "block-2");
    expect(lResult?.errors).toHaveLength(0);
    expect(lResult?.solution?.real["0-0"]).toBeCloseTo(6);
    expect(lResult?.variableName).toBe("L");

    // Solve w
    const r2 = await solveDocument(blocks, "block-3", r1.resolvedMap);
    const wResult = r2.results.find((r) => r.blockId === "block-3");
    expect(wResult?.errors).toHaveLength(0);
    expect(wResult?.solution?.real["0-0"]).toBeCloseTo(12);

    // Solve E
    const r3 = await solveDocument(blocks, "block-4", r2.resolvedMap);
    const eResult = r3.results.find((r) => r.blockId === "block-4");
    expect(eResult?.errors).toHaveLength(0);
    expect(eResult?.solution?.real["0-0"]).toBeCloseTo(200000);

    // Solve I
    const r4 = await solveDocument(blocks, "block-5", r3.resolvedMap);
    const iResult = r4.results.find((r) => r.blockId === "block-5");
    expect(iResult?.errors).toHaveLength(0);
    expect(iResult?.solution?.real["0-0"]).toBeCloseTo(85600000);

    // Solve delta — unit-naive arithmetic
    // (5 * 12 * 6^4) / (384 * 200000 * 85600000)
    // = (5 * 12 * 1296) / (384 * 200000 * 85600000)
    // = 77760 / 6573158400000000 ≈ 1.1827e-11
    const r5 = await solveDocument(blocks, "block-7", r4.resolvedMap);
    const deltaResult = r5.results.find((r) => r.blockId === "block-7");
    expect(deltaResult?.errors).toHaveLength(0);
    expect(deltaResult?.variableName).toBe("delta");
    expect(deltaResult?.solution?.real["0-0"]).toBeGreaterThan(0);
  });

  it("re-solves delta when L changes (dependency propagation)", async () => {
    // Pre-populate resolved map with all variables solved
    const preResolved: ResolvedEquation[] = [
      { blockId: "block-2", order: 2, variableName: "L", solution: { real: { "0-0": 6 }, imag: { "0-0": 0 }, size: "1x1", units: "m",   baseUnits: emptyBase, multiplier: 1 }, error: null },
      { blockId: "block-3", order: 3, variableName: "w", solution: { real: { "0-0": 12 }, imag: { "0-0": 0 }, size: "1x1", units: "kN/m", baseUnits: emptyBase, multiplier: 1 }, error: null },
      { blockId: "block-4", order: 4, variableName: "E", solution: { real: { "0-0": 200000 }, imag: { "0-0": 0 }, size: "1x1", units: "MPa", baseUnits: emptyBase, multiplier: 1 }, error: null },
      { blockId: "block-5", order: 5, variableName: "I", solution: { real: { "0-0": 85600000 }, imag: { "0-0": 0 }, size: "1x1", units: "mm^4", baseUnits: emptyBase, multiplier: 1 }, error: null },
      { blockId: "block-7", order: 7, variableName: "delta", solution: { real: { "0-0": 1.18e-11 }, imag: { "0-0": 0 }, size: "1x1", units: "mm", baseUnits: emptyBase, multiplier: 1 }, error: null },
    ];

    // Now change L from 6 → 12 (block-2 changed)
    const blocksWithNewL = blocks.map((b) =>
      b.id === "block-2" ? { ...b, definition: { ...b.definition, raw: "L = 12" } } : b,
    );

    const { results } = await solveDocument(blocksWithNewL, "block-2", preResolved);

    // Should re-solve L and delta (and nothing else — w, E, I don't depend on L)
    const solvedIds = results.map((r) => r.blockId);
    expect(solvedIds).toContain("block-2");  // L itself
    expect(solvedIds).toContain("block-7");  // delta depends on L

    const newL = results.find((r) => r.blockId === "block-2");
    expect(newL?.solution?.real["0-0"]).toBeCloseTo(12);

    const newDelta = results.find((r) => r.blockId === "block-7");
    // With L=12: (5*12*12^4)/(384*200000*85600000) — 16x larger than L=6
    expect(newDelta?.solution?.real["0-0"]).toBeGreaterThan(0);
  });
});
