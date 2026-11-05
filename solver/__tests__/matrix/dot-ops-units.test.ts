/**
 * Unit propagation through DotDiv / DotMult (solver/steps/07-remove-builtin-equations.ts).
 *
 * These used to return bare numbers, so E*DotDiv(A, L) lost its m²/m and everything
 * downstream (gaussE, displacement/force results) was mislabelled.
 *
 *   - DotDiv(m², m) → m;  DotMult(m, m) → m²;  DotDiv(m, m) → unitless
 *   - Stiffness chain: k = E*DotDiv(A, L) → kg/s² (N/m); gaussE(K, F) with F in N → m
 */

import { describe, it, expect } from "vitest";
import { solveDocument } from "../../worker/document-solver";
import type { OrderedBlock, ResolvedEquation } from "../../types";

async function solveAll(defs: [string, string][]): Promise<Record<string, ResolvedEquation | undefined>> {
  const blocks: OrderedBlock[] = defs.map(([name, raw], i) => ({
    id: `b${i}`, order: i + 1, type: "EQUATION",
    definition: { raw: `${name} = ${raw}`, variableName: name, unit: "" },
  }));
  let map: ResolvedEquation[] = [];
  for (const b of blocks) {
    const r = await solveDocument(blocks, b.id, map);
    map = r.resolvedMap;
  }
  return Object.fromEntries(map.map((m) => [m.variableName, m]));
}

const M     = [0, 0, 0, 1, 0, 0, 0, 0];
const M2    = [0, 0, 0, 2, 0, 0, 0, 0];
const KG_S2 = [0, 0, -2, 0, 1, 0, 0, 0]; // N/m
const NONE  = [0, 0, 0, 0, 0, 0, 0, 0];

describe("DotDiv / DotMult unit propagation", () => {
  it("DotDiv(m^2, m) → m", async () => {
    const r = await solveAll([["A", "[4, 6]*1m^2"], ["L", "[2, 3]*1m"], ["r", "DotDiv(A, L)"]]);
    expect(r.r?.error).toBeNull();
    expect(Array.from(r.r!.solution!.baseUnits)).toEqual(M);
    expect(r.r?.solution?.real["0-0"]).toBeCloseTo(2);
    expect(r.r?.solution?.real["0-1"]).toBeCloseTo(2);
  });

  it("DotMult(m, m) → m^2", async () => {
    const r = await solveAll([["L", "[2, 3]*1m"], ["q", "DotMult(L, L)"]]);
    expect(Array.from(r.q!.solution!.baseUnits)).toEqual(M2);
    expect(r.q?.solution?.real["0-1"]).toBeCloseTo(9);
  });

  it("DotDiv(m, m) is unitless", async () => {
    const r = await solveAll([["L", "[2, 3]*1m"], ["ratio", "DotDiv(L, L)"]]);
    expect(Array.from(r.ratio!.solution!.baseUnits)).toEqual(NONE);
  });

  it("plain numbers still work with no units", async () => {
    const r = await solveAll([["a", "[10, 20]"], ["b", "[2, 5]"], ["c", "DotDiv(a, b)"]]);
    expect(r.c?.solution?.real["0-0"]).toBeCloseTo(5);
    expect(r.c?.solution?.real["0-1"]).toBeCloseTo(4);
    expect(Array.from(r.c!.solution!.baseUnits)).toEqual(NONE);
  });
});

describe("Stiffness chain keeps correct units", () => {
  it("k = E*DotDiv(A, L) is N/m and gaussE(K, F) is m", async () => {
    const r = await solveAll([
      ["E", "200GPa"],
      ["A", "[2500, 1500]*1mm^2"],
      ["L", "[4, 2]*1m"],
      ["k", "E*DotDiv(A, L)"],
      ["K", "k[0]*[1, 0; 0, 1]"],
      ["F", "[40; 20]*1kN"],
      ["U", "gaussE(K, F)"],
    ]);
    expect(Array.from(r.k!.solution!.baseUnits)).toEqual(KG_S2);
    expect(r.k?.solution?.real["0-0"]).toBeCloseTo(1.25e8);
    expect(Array.from(r.U!.solution!.baseUnits)).toEqual(M);
    expect(r.U?.solution?.real["0-0"]).toBeCloseTo(3.2e-4);
    expect(r.U?.solution?.real["1-0"]).toBeCloseTo(1.6e-4);
  });
});
