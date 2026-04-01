import { describe, it, expect } from "vitest";
import { runPipeline } from "../../pipeline";
import { CONSTANT_MAP } from "../../units/constant-data";
import type { SolveContext } from "../../types";
import { ctx } from "../helpers";

describe("Matrix literal creation", () => {
  it("row vector [1,2,3] has size 1x3", async () => {
    const r = await runPipeline(ctx("A = [1,2,3]"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("A");
    expect(r.solution.size).toBe("1x3");
    expect(r.solution.real["0-0"]).toBeCloseTo(1);
    expect(r.solution.real["0-1"]).toBeCloseTo(2);
    expect(r.solution.real["0-2"]).toBeCloseTo(3);
  });

  it("column vector [1;2;3] has size 3x1", async () => {
    const r = await runPipeline(ctx("A = [1;2;3]"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.size).toBe("3x1");
    expect(r.solution.real["0-0"]).toBeCloseTo(1);
    expect(r.solution.real["1-0"]).toBeCloseTo(2);
    expect(r.solution.real["2-0"]).toBeCloseTo(3);
  });

  it("2x2 matrix [1,2;3,4]", async () => {
    const r = await runPipeline(ctx("A = [1,2;3,4]"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.size).toBe("2x2");
    expect(r.solution.real["0-0"]).toBeCloseTo(1);
    expect(r.solution.real["0-1"]).toBeCloseTo(2);
    expect(r.solution.real["1-0"]).toBeCloseTo(3);
    expect(r.solution.real["1-1"]).toBeCloseTo(4);
  });

  it("2x3 matrix [1,2,3;4,5,6]", async () => {
    const r = await runPipeline(ctx("A = [1,2,3;4,5,6]"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.size).toBe("2x3");
    expect(r.solution.real["1-2"]).toBeCloseTo(6);
  });

  it("matrix with decimal values [1.5,2.5;3.5,4.5]", async () => {
    const r = await runPipeline(ctx("A = [1.5,2.5;3.5,4.5]"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1.5);
    expect(r.solution.real["1-1"]).toBeCloseTo(4.5);
  });
});

describe("Scalar * matrix", () => {
  it("2 * [1,2,3] scales all elements", async () => {
    const r = await runPipeline(ctx("B = 2 * [1,2,3]"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.size).toBe("1x3");
    expect(r.solution.real["0-0"]).toBeCloseTo(2);
    expect(r.solution.real["0-1"]).toBeCloseTo(4);
    expect(r.solution.real["0-2"]).toBeCloseTo(6);
  });

  it("[1,2,3] / 2 halves all elements", async () => {
    const r = await runPipeline(ctx("B = [2,4,6] / 2"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1);
    expect(r.solution.real["0-1"]).toBeCloseTo(2);
    expect(r.solution.real["0-2"]).toBeCloseTo(3);
  });
});

describe("Matrix + Matrix (element-wise)", () => {
  it("[1,2,3] + [4,5,6]", async () => {
    const r = await runPipeline(ctx("C = [1,2,3] + [4,5,6]"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.size).toBe("1x3");
    expect(r.solution.real["0-0"]).toBeCloseTo(5);
    expect(r.solution.real["0-1"]).toBeCloseTo(7);
    expect(r.solution.real["0-2"]).toBeCloseTo(9);
  });

  it("[5,5] - [2,3]", async () => {
    const r = await runPipeline(ctx("C = [5,5] - [2,3]"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(3);
    expect(r.solution.real["0-1"]).toBeCloseTo(2);
  });
});

describe("Matrix * Matrix (matrix multiplication)", () => {
  it("[1,2;3,4] * [1,0;0,1] = identity", async () => {
    const r = await runPipeline(ctx("C = [1,2;3,4] * [1,0;0,1]"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.size).toBe("2x2");
    expect(r.solution.real["0-0"]).toBeCloseTo(1);
    expect(r.solution.real["0-1"]).toBeCloseTo(2);
    expect(r.solution.real["1-0"]).toBeCloseTo(3);
    expect(r.solution.real["1-1"]).toBeCloseTo(4);
  });
});

describe("Matrix variable substitution", () => {
  it("B = A + [0,0,1] where A is a previously solved 1x3 matrix", async () => {
    const emptyBase: [number,number,number,number,number,number,number,number] = [0,0,0,0,0,0,0,0];

    // First solve A = [1,2,3]
    const ctxA = await runPipeline(ctx("A = [1,2,3]"));
    expect(ctxA.errors).toHaveLength(0);

    // Now solve B = A + [0,0,1] with A in documentEquations
    const ctxB: SolveContext = {
      eqId: "b", fileId: "f",
      rawEquation: "B = A + [0,0,1]", variableName: "", rhsString: "",
      documentEquations: [{
        blockId: "a", order: 0, variableName: "A",
        solution: {
          real: ctxA.solution.real,
          imag: {},
          size: "1x3",
          units: "",
          baseUnits: emptyBase,
          multiplier: 1,
        },
        error: null,
      }],
      currentBlockOrder: 1,
      constants: CONSTANT_MAP, unitList: [], scaleUnits: [],
      importedFunctions: [], cadParts: {}, datasets: new Map(),
      workingString: "B = A + [0,0,1]", tokens: [], keyArray: [],
      variableArray: [], postfixArray: [],
      solution: { real: {"0-0":0}, imag: {"0-0":0}, size:"1x1", units:"", baseUnits: emptyBase, multiplier:1, quantity:"" },
      display: { equation:"", solution:"", numericalModel:"", unitsModel:"", dimensionsModel:"", quantitiesModel:"" },
      errors: [],
    };

    const r = await runPipeline(ctxB);
    expect(r.errors).toHaveLength(0);
    expect(r.solution.size).toBe("1x3");
    expect(r.solution.real["0-0"]).toBeCloseTo(1);
    expect(r.solution.real["0-1"]).toBeCloseTo(2);
    expect(r.solution.real["0-2"]).toBeCloseTo(4); // 3 + 1
  });
});
