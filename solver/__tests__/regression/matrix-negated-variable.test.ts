/**
 * Regression: negating a negative variable inside a matrix literal.
 *
 * `[-c, ...]` with c = -0.5547 used to evaluate the cell as "- -0.5547", which the
 * sub-pipeline rejected; the cell error fallback then silently stored 0.
 * Fixed in solver/steps/15-replace-matrices.ts by parenthesizing negative values.
 */

import { describe, it, expect } from "vitest";
import { solveDocument } from "../../worker/document-solver";
import type { OrderedBlock, ResolvedEquation } from "../../types";

function eq(order: number, name: string, raw: string): OrderedBlock {
  return {
    id: `b${order}`, order, type: "EQUATION",
    definition: { raw: `${name} = ${raw}`, variableName: name, unit: "" },
  };
}

async function solveAll(defs: [string, string][]): Promise<Record<string, ResolvedEquation | undefined>> {
  const blocks = defs.map(([name, raw], i) => eq(i + 1, name, raw));
  let map: ResolvedEquation[] = [];
  for (const b of blocks) {
    const r = await solveDocument(blocks, b.id, map);
    map = r.resolvedMap;
  }
  return Object.fromEntries(map.map((m) => [m.variableName, m]));
}

describe("Matrix literal with a negated negative variable", () => {
  it("[-c, -s, c, s] with c < 0 negates c correctly", async () => {
    const r = await solveAll([
      ["c", "-0.5547"],
      ["s", "0.83205"],
      ["B", "[-c, -s, c, s, 0, 0, 0]"],
    ]);
    const B = r.B?.solution;
    expect(r.B?.error).toBeNull();
    expect(B?.size).toBe("1x7");
    expect(B?.real["0-0"]).toBeCloseTo(0.5547);
    expect(B?.real["0-1"]).toBeCloseTo(-0.83205);
    expect(B?.real["0-2"]).toBeCloseTo(-0.5547);
    expect(B?.real["0-3"]).toBeCloseTo(0.83205);
  });

  it("negated negative element of an indexed vector, e.g. [-dc_x[3], dc_x[3]]", async () => {
    const r = await solveAll([
      ["dc_x", "[1, 0, 0.2, -0.5547]"],
      ["dc_y", "[0, 1, 0.3, 0.83205]"],
      ["b", "[-dc_x[3], -dc_y[3], 0, dc_x[3], dc_y[3], 0, 0]"],
    ]);
    const b = r.b?.solution;
    expect(r.b?.error).toBeNull();
    expect(b?.real["0-0"]).toBeCloseTo(0.5547);
    expect(b?.real["0-1"]).toBeCloseTo(-0.83205);
    expect(b?.real["0-3"]).toBeCloseTo(-0.5547);
    expect(b?.real["0-4"]).toBeCloseTo(0.83205);
  });

  it("negated negative variable in a non-leading cell and in a column vector", async () => {
    const r = await solveAll([
      ["c", "-2"],
      ["row", "[1, -c]"],
      ["col", "[-c; 1]"],
    ]);
    expect(r.row?.solution?.real["0-1"]).toBeCloseTo(2);
    expect(r.col?.solution?.real["0-0"]).toBeCloseTo(2);
    expect(r.col?.solution?.real["1-0"]).toBeCloseTo(1);
  });
});
