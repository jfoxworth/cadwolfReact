import { describe, it, expect } from "vitest";
import { runPipeline } from "../../pipeline";
import { ctx } from "../helpers";
import type { ResolvedEquation } from "../../types";

const emptyBase: [number,number,number,number,number,number,number,number] = [0,0,0,0,0,0,0,0];

function rowVec(name: string, vals: number[], order: number): ResolvedEquation {
  const real: Record<string, number> = {};
  vals.forEach((v, i) => { real[`0-${i}`] = v; });
  return {
    blockId: name, order, variableName: name,
    solution: { real, imag: {}, size: `1x${vals.length}`, units: "", baseUnits: emptyBase, multiplier: 1 },
    error: null,
  };
}

function colVec(name: string, vals: number[], order: number): ResolvedEquation {
  const real: Record<string, number> = {};
  vals.forEach((v, i) => { real[`${i}-0`] = v; });
  return {
    blockId: name, order, variableName: name,
    solution: { real, imag: {}, size: `${vals.length}x1`, units: "", baseUnits: emptyBase, multiplier: 1 },
    error: null,
  };
}

describe("row2mat", () => {
  it("broadcasts a row vector [1,2,3] into 4 identical rows → 4×3 matrix", async () => {
    const c = ctx("M = row2mat(r, 4)");
    c.documentEquations = [rowVec("r", [1, 2, 3], -1)];
    c.currentBlockOrder = 0;
    const res = await runPipeline(c);
    expect(res.errors).toHaveLength(0);
    // 4 rows × 3 cols = 12 entries
    expect(Object.keys(res.solution.real)).toHaveLength(12);
    // every row should equal the input vector
    for (let row = 0; row < 4; row++) {
      expect(res.solution.real[`${row}-0`]).toBeCloseTo(1, 4);
      expect(res.solution.real[`${row}-1`]).toBeCloseTo(2, 4);
      expect(res.solution.real[`${row}-2`]).toBeCloseTo(3, 4);
    }
  });

  it("row2mat of a single value with 2 rows → 2×1 matrix", async () => {
    const c = ctx("M = row2mat(r, 2)");
    c.documentEquations = [rowVec("r", [7], -1)];
    c.currentBlockOrder = 0;
    const res = await runPipeline(c);
    expect(res.errors).toHaveLength(0);
    expect(res.solution.real["0-0"]).toBeCloseTo(7, 4);
    expect(res.solution.real["1-0"]).toBeCloseTo(7, 4);
  });
});

describe("col2mat", () => {
  it("broadcasts a column vector [10,20] into 3 identical columns → 2×3 matrix", async () => {
    const c = ctx("M = col2mat(v, 3)");
    c.documentEquations = [colVec("v", [10, 20], -1)];
    c.currentBlockOrder = 0;
    const res = await runPipeline(c);
    expect(res.errors).toHaveLength(0);
    // 2 rows × 3 cols = 6 entries
    expect(Object.keys(res.solution.real)).toHaveLength(6);
    for (let col = 0; col < 3; col++) {
      expect(res.solution.real[`0-${col}`]).toBeCloseTo(10, 4);
      expect(res.solution.real[`1-${col}`]).toBeCloseTo(20, 4);
    }
  });
});

describe("row2mat + col2mat combined — heatmap z-matrix pattern", () => {
  it("builds a 3×4 matrix where each row is x and each col varies by y", async () => {
    // A common heatmap pattern: zMat = row2mat(x, nY) + col2mat(y, nX)
    // x = [0,1,2,3], y = [0,10,20]
    // row2mat(x, 3) → 3×4 with each row = [0,1,2,3]
    // col2mat(y, 4) → 3×4 with each col = [0,10,20]
    // sum → row[i][j] = x[j] + y[i]
    const c = ctx("Z = row2mat(x, 3) + col2mat(y, 4)");
    c.documentEquations = [
      rowVec("x", [0, 1, 2, 3], -2),
      colVec("y", [0, 10, 20], -1),
    ];
    c.currentBlockOrder = 0;
    const res = await runPipeline(c);
    expect(res.errors).toHaveLength(0);
    // 3 rows × 4 cols = 12 entries
    expect(Object.keys(res.solution.real)).toHaveLength(12);
    // Z[i][j] = x[j] + y[i]
    const x = [0, 1, 2, 3];
    const y = [0, 10, 20];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 4; j++) {
        expect(res.solution.real[`${i}-${j}`]).toBeCloseTo(x[j] + y[i], 4);
      }
    }
  });
});
