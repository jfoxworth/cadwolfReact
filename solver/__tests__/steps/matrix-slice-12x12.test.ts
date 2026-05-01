import { describe, it, expect } from "vitest";
import { runPipeline } from "../../pipeline";
import { CONSTANT_MAP } from "../../units/constant-data";
import type { SolveContext } from "../../types";

const emptyBase: [number,number,number,number,number,number,number,number] = [0,0,0,0,0,0,0,0];

// Build a 12x12 matrix real dict with a known pattern:
// K[r][c] = (r+1) * 100 + (c+1)  for r,c in 0..11
// Some negative values: columns 6,7 in rows 0,1 are negative
function make12x12(): Record<string, number> {
  const real: Record<string, number> = {};
  for (let r = 0; r < 12; r++) {
    for (let c = 0; c < 12; c++) {
      const base = (r + 1) * 1000 + (c + 1);
      // Flip sign for col 6-7 in rows 0-1 (mimics structure of user's K)
      const sign = (r < 2 && c >= 6 && c <= 7) ? -1 : 1;
      real[`${r}-${c}`] = sign * base;
    }
  }
  return real;
}

function makeCtx(equation: string): SolveContext {
  return {
    eqId: "t", fileId: "f",
    rawEquation: equation, variableName: "", rhsString: "",
    documentEquations: [{
      blockId: "k", order: 0, variableName: "K",
      solution: {
        real: make12x12(),
        imag: {},
        size: "12x12",
        units: "",
        baseUnits: emptyBase,
        multiplier: 1,
      },
      error: null,
    }],
    currentBlockOrder: 1,
    constants: CONSTANT_MAP, unitList: [], scaleUnits: [],
    importedFunctions: [], cadParts: {}, datasets: new Map(),
    workingString: equation, tokens: [], keyArray: [],
    variableArray: [], postfixArray: [],
    solution: { real: {"0-0":0}, imag: {"0-0":0}, size:"1x1", units:"", baseUnits: emptyBase, multiplier:1, quantity:"" },
    display: { equation:"", solution:"", numericalModel:"", unitsModel:"", dimensionsModel:"", quantitiesModel:"" },
    errors: [],
  };
}

describe("12x12 matrix row slices — values must match source matrix exactly", () => {

  it("K[1,:] row 1 — all 12 elements match K[1][c]", async () => {
    const r = await runPipeline(makeCtx("x = K[1,:]"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.size).toBe("1x12");
    for (let c = 0; c < 12; c++) {
      const expected = make12x12()[`1-${c}`];
      expect(r.solution.real[`0-${c}`]).toBeCloseTo(expected, 6);
    }
  });

  it("K[10,:] row 10 — all 12 elements match K[10][c]", async () => {
    const r = await runPipeline(makeCtx("x = K[10,:]"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.size).toBe("1x12");
    for (let c = 0; c < 12; c++) {
      const expected = make12x12()[`10-${c}`];
      expect(r.solution.real[`0-${c}`]).toBeCloseTo(expected, 6);
    }
  });

  it("K[10:11,:] rows 10-11 — both rows match K[10][c] and K[11][c]", async () => {
    const r = await runPipeline(makeCtx("x = K[10:11,:]"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.size).toBe("2x12");
    const src = make12x12();
    for (let c = 0; c < 12; c++) {
      expect(r.solution.real[`0-${c}`]).toBeCloseTo(src[`10-${c}`], 6);
      expect(r.solution.real[`1-${c}`]).toBeCloseTo(src[`11-${c}`], 6);
    }
  });

  it("K[0:1,:] rows 0-1 — sign-flipped cols 6-7 are preserved correctly", async () => {
    const r = await runPipeline(makeCtx("x = K[0:1,:]"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.size).toBe("2x12");
    const src = make12x12();
    // Row 0
    expect(r.solution.real["0-6"]).toBeCloseTo(src["0-6"], 6); // negative in source
    expect(r.solution.real["0-7"]).toBeCloseTo(src["0-7"], 6); // negative in source
    // Row 1
    expect(r.solution.real["1-6"]).toBeCloseTo(src["1-6"], 6); // negative in source
    expect(r.solution.real["1-7"]).toBeCloseTo(src["1-7"], 6); // negative in source
  });

  it("K[2:10,2:10] 9x9 submatrix — all elements match source", async () => {
    const r = await runPipeline(makeCtx("x = K[2:10,2:10]"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.size).toBe("9x9");
    const src = make12x12();
    for (let r2 = 0; r2 < 9; r2++) {
      for (let c = 0; c < 9; c++) {
        const expected = src[`${r2 + 2}-${c + 2}`];
        expect(r.solution.real[`${r2}-${c}`]).toBeCloseTo(expected, 6);
      }
    }
  });

  it("K[0,10] single element — correct value", async () => {
    const res = await runPipeline(makeCtx("x = K[0,10]"));
    expect(res.errors).toHaveLength(0);
    expect(res.solution.real["0-0"]).toBeCloseTo(make12x12()["0-10"], 6);
  });

  it("K[1,6] single element — negative value preserved", async () => {
    const res = await runPipeline(makeCtx("x = K[1,6]"));
    expect(res.errors).toHaveLength(0);
    expect(res.solution.real["0-0"]).toBeCloseTo(make12x12()["1-6"], 6); // -1607
  });
});
