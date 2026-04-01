import { describe, it, expect } from "vitest";
import { runPipeline } from "../../pipeline";
import { CONSTANT_MAP } from "../../units/constant-data";
import type { SolveContext } from "../../types";

const emptyBase: [number,number,number,number,number,number,number,number] = [0,0,0,0,0,0,0,0];

function ctx(raw: string): SolveContext {
  return {
    eqId: "t", fileId: "f",
    rawEquation: raw, variableName: "", rhsString: "",
    documentEquations: [], currentBlockOrder: 0,
    constants: CONSTANT_MAP, unitList: [], scaleUnits: [],
    importedFunctions: [], cadParts: {}, datasets: new Map(),
    workingString: raw, tokens: [], keyArray: [],
    variableArray: [], postfixArray: [],
    solution: { real: {"0-0":0}, imag: {"0-0":0}, size:"1x1", units:"", baseUnits: emptyBase, multiplier:1, quantity:"" },
    display: { equation:"", solution:"", numericalModel:"", unitsModel:"", dimensionsModel:"", quantitiesModel:"" },
    errors: [],
  };
}

describe("Built-in function evaluation (steps 06+07)", () => {
  it("sin(0) = 0", async () => {
    const r = await runPipeline(ctx("y = sin(0)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0);
  });

  it("sin(pi/2) ≈ 1 using constant pi", async () => {
    // pi is in BUILTIN_CONSTANTS with value Math.PI
    const r = await runPipeline(ctx("y = sin(3.14159265358979)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4); // sin(π) ≈ 0
  });

  it("cos(0) = 1", async () => {
    const r = await runPipeline(ctx("y = cos(0)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1);
  });

  it("abs(-5) = 5", async () => {
    const r = await runPipeline(ctx("y = abs(-5)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(5);
  });

  it("sqrt via root(2,4) = 2", async () => {
    const r = await runPipeline(ctx("y = root(2,4)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(2);
  });

  it("ln(1) = 0", async () => {
    const r = await runPipeline(ctx("y = ln(1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0);
  });

  it("function result feeds into arithmetic: 2 * cos(0) = 2", async () => {
    const r = await runPipeline(ctx("y = 2 * cos(0)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(2);
  });

  it("nested-like: abs(-3) + cos(0) = 4", async () => {
    const r = await runPipeline(ctx("y = abs(-3) + cos(0)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(4);
  });

  it("sin(30deg) ≈ 0.5 (degree-to-radian conversion inside function arg)", async () => {
    const r = await runPipeline(ctx("y = sin(30deg)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0.5, 4);
  });

  it("cos(90deg) ≈ 0", async () => {
    const r = await runPipeline(ctx("y = cos(90deg)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });
});
