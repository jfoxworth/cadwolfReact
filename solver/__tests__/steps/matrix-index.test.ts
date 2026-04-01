import { describe, it, expect } from "vitest";
import { runPipeline } from "../../pipeline";
import { CONSTANT_MAP } from "../../units/constant-data";
import type { SolveContext } from "../../types";

// Shared helper: build a SolveContext that has a previously-solved matrix A in scope.
// A = [1,2,3;4,5,6] (2x3)
const emptyBase: [number,number,number,number,number,number,number,number] = [0,0,0,0,0,0,0,0];

function ctxWithMatrix(equation: string): SolveContext {
  return {
    eqId: "t", fileId: "f",
    rawEquation: equation, variableName: "", rhsString: "",
    documentEquations: [{
      blockId: "a", order: 0, variableName: "A",
      solution: {
        real: { "0-0":1,"0-1":2,"0-2":3,"1-0":4,"1-1":5,"1-2":6 },
        imag: {},
        size: "2x3",
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

// Row-vector context: v = [10, 20, 30, 40, 50]
function ctxWithVector(equation: string): SolveContext {
  return {
    eqId: "t", fileId: "f",
    rawEquation: equation, variableName: "", rhsString: "",
    documentEquations: [{
      blockId: "v", order: 0, variableName: "v",
      solution: {
        real: { "0-0":10,"0-1":20,"0-2":30,"0-3":40,"0-4":50 },
        imag: {},
        size: "1x5",
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

describe("Matrix element access M[i,j] (0-based)", () => {
  it("A[0,0] returns first element (top-left)", async () => {
    const r = await runPipeline(ctxWithMatrix("x = A[0,0]"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.size).toBe("1x1");
    expect(r.solution.real["0-0"]).toBeCloseTo(1);
  });

  it("A[0,2] returns element from first row, third column", async () => {
    const r = await runPipeline(ctxWithMatrix("x = A[0,2]"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(3);
  });

  it("A[1,0] returns element from second row, first column", async () => {
    const r = await runPipeline(ctxWithMatrix("x = A[1,0]"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(4);
  });

  it("A[1,1] returns 5", async () => {
    const r = await runPipeline(ctxWithMatrix("x = A[1,1]"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(5);
  });

  it("A[1,2] returns last element 6", async () => {
    const r = await runPipeline(ctxWithMatrix("x = A[1,2]"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(6);
  });
});

describe("Row vector single index v[i] (0-based)", () => {
  it("v[0] returns first element 10", async () => {
    const r = await runPipeline(ctxWithVector("x = v[0]"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(10);
  });

  it("v[2] returns 30", async () => {
    const r = await runPipeline(ctxWithVector("x = v[2]"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(30);
  });

  it("v[4] returns last element 50", async () => {
    const r = await runPipeline(ctxWithVector("x = v[4]"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(50);
  });
});

describe("2-D matrix single index A[j] returns column j as column vector (0-based)", () => {
  it("A[0] returns first column [1;4] as 2x1", async () => {
    const r = await runPipeline(ctxWithMatrix("x = A[0]"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.size).toBe("2x1");
    expect(r.solution.real["0-0"]).toBeCloseTo(1);
    expect(r.solution.real["1-0"]).toBeCloseTo(4);
  });

  it("A[2] returns third column [3;6] as 2x1", async () => {
    const r = await runPipeline(ctxWithMatrix("x = A[2]"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.size).toBe("2x1");
    expect(r.solution.real["0-0"]).toBeCloseTo(3);
    expect(r.solution.real["1-0"]).toBeCloseTo(6);
  });
});

describe("Row vector range v[i:j] (0-based)", () => {
  it("v[1:3] returns [20,30,40]", async () => {
    const r = await runPipeline(ctxWithVector("x = v[1:3]"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.size).toBe("1x3");
    expect(r.solution.real["0-0"]).toBeCloseTo(20);
    expect(r.solution.real["0-1"]).toBeCloseTo(30);
    expect(r.solution.real["0-2"]).toBeCloseTo(40);
  });

  it("v[0:4] returns the entire vector", async () => {
    const r = await runPipeline(ctxWithVector("x = v[0:4]"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.size).toBe("1x5");
    expect(r.solution.real["0-0"]).toBeCloseTo(10);
    expect(r.solution.real["0-4"]).toBeCloseTo(50);
  });
});

describe("2-D matrix row slice A[i, j:k] (0-based)", () => {
  it("A[0,0:1] returns [1,2] from first row", async () => {
    const r = await runPipeline(ctxWithMatrix("x = A[0,0:1]"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.size).toBe("1x2");
    expect(r.solution.real["0-0"]).toBeCloseTo(1);
    expect(r.solution.real["0-1"]).toBeCloseTo(2);
  });

  it("A[1,1:2] returns [5,6] from second row", async () => {
    const r = await runPipeline(ctxWithMatrix("x = A[1,1:2]"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.size).toBe("1x2");
    expect(r.solution.real["0-0"]).toBeCloseTo(5);
    expect(r.solution.real["0-1"]).toBeCloseTo(6);
  });
});

describe("2-D matrix column slice A[i:j, k] (0-based)", () => {
  it("A[0:1,0] returns first column as column vector", async () => {
    const r = await runPipeline(ctxWithMatrix("x = A[0:1,0]"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.size).toBe("2x1");
    expect(r.solution.real["0-0"]).toBeCloseTo(1);
    expect(r.solution.real["1-0"]).toBeCloseTo(4);
  });

  it("A[0:1,2] returns third column [3,6]", async () => {
    const r = await runPipeline(ctxWithMatrix("x = A[0:1,2]"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.size).toBe("2x1");
    expect(r.solution.real["0-0"]).toBeCloseTo(3);
    expect(r.solution.real["1-0"]).toBeCloseTo(6);
  });
});

describe("Indexed element used in arithmetic (0-based)", () => {
  it("A[0,0] + A[1,2] = 1 + 6 = 7", async () => {
    const r = await runPipeline(ctxWithMatrix("x = A[0,0] + A[1,2]"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(7);
  });

  it("2 * A[0,1] = 4", async () => {
    const r = await runPipeline(ctxWithMatrix("x = 2 * A[0,1]"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(4);
  });
});
