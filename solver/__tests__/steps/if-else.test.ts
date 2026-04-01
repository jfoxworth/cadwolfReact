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

describe("IfElse function", () => {
  it("== true branch: IfElse(5, ==, 5, 10, 20) = 10", async () => {
    const r = await runPipeline(ctx("y = IfElse(5, ==, 5, 10, 20)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(10);
  });

  it("== false branch: IfElse(5, ==, 3, 10, 20) = 20", async () => {
    const r = await runPipeline(ctx("y = IfElse(5, ==, 3, 10, 20)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(20);
  });

  it("!= true branch: IfElse(5, !=, 3, 10, 20) = 10", async () => {
    const r = await runPipeline(ctx("y = IfElse(5, !=, 3, 10, 20)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(10);
  });

  it("!= false branch: IfElse(5, !=, 5, 10, 20) = 20", async () => {
    const r = await runPipeline(ctx("y = IfElse(5, !=, 5, 10, 20)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(20);
  });

  it("> true branch: IfElse(5, >, 3, 10, 20) = 10", async () => {
    const r = await runPipeline(ctx("y = IfElse(5, >, 3, 10, 20)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(10);
  });

  it("> false branch: IfElse(5, >, 8, 10, 20) = 20", async () => {
    const r = await runPipeline(ctx("y = IfElse(5, >, 8, 10, 20)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(20);
  });

  it("< true branch: IfElse(3, <, 5, 10, 20) = 10", async () => {
    const r = await runPipeline(ctx("y = IfElse(3, <, 5, 10, 20)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(10);
  });

  it("< false branch: IfElse(5, <, 3, 10, 20) = 20", async () => {
    const r = await runPipeline(ctx("y = IfElse(5, <, 3, 10, 20)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(20);
  });

  it(">= true (equal): IfElse(5, >=, 5, 10, 20) = 10", async () => {
    const r = await runPipeline(ctx("y = IfElse(5, >=, 5, 10, 20)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(10);
  });

  it(">= true (greater): IfElse(6, >=, 5, 10, 20) = 10", async () => {
    const r = await runPipeline(ctx("y = IfElse(6, >=, 5, 10, 20)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(10);
  });

  it(">= false branch: IfElse(3, >=, 5, 10, 20) = 20", async () => {
    const r = await runPipeline(ctx("y = IfElse(3, >=, 5, 10, 20)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(20);
  });

  it("<= true (equal): IfElse(5, <=, 5, 10, 20) = 10", async () => {
    const r = await runPipeline(ctx("y = IfElse(5, <=, 5, 10, 20)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(10);
  });

  it("<= true (less): IfElse(3, <=, 5, 10, 20) = 10", async () => {
    const r = await runPipeline(ctx("y = IfElse(3, <=, 5, 10, 20)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(10);
  });

  it("<= false branch: IfElse(7, <=, 5, 10, 20) = 20", async () => {
    const r = await runPipeline(ctx("y = IfElse(7, <=, 5, 10, 20)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(20);
  });

  it("no falseVal returns 0: IfElse(5, ==, 3, 10) = 0", async () => {
    const r = await runPipeline(ctx("y = IfElse(5, ==, 3, 10)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0);
  });

  it("no falseVal true branch: IfElse(5, ==, 5, 10) = 10", async () => {
    const r = await runPipeline(ctx("y = IfElse(5, ==, 5, 10)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(10);
  });

  it("expression in args: IfElse(2+3, ==, 5, 100, 200) = 100", async () => {
    const r = await runPipeline(ctx("y = IfElse(2+3, ==, 5, 100, 200)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(100);
  });

  it("expression in compareVal: IfElse(10, ==, 5*2, 100, 200) = 100", async () => {
    const r = await runPipeline(ctx("y = IfElse(10, ==, 5*2, 100, 200)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(100);
  });

  it("wrong arg count (3 args) produces an error", async () => {
    const r = await runPipeline(ctx("y = IfElse(5, ==, 5)"));
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("invalid operator produces an error", async () => {
    const r = await runPipeline(ctx("y = IfElse(5, &&, 5, 10, 20)"));
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("case-insensitive: ifelse works same as IfElse", async () => {
    const r = await runPipeline(ctx("y = ifelse(5, ==, 5, 10, 20)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(10);
  });

  it("nested: IfElse in trueVal branch", async () => {
    // outer true → inner: 3 < 5 → true → 100
    const r = await runPipeline(ctx("y = IfElse(5, >, 3, IfElse(3, <, 5, 100, 200), 999)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(100);
  });

  it("nested: IfElse in falseVal branch", async () => {
    // outer false → inner: 3 < 5 → true → 42
    const r = await runPipeline(ctx("y = IfElse(1, >, 3, 999, IfElse(3, <, 5, 42, 0))"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(42);
  });

  it("nested: three levels deep", async () => {
    // outer true → mid true → inner false → 7
    const r = await runPipeline(ctx("y = IfElse(1, ==, 1, IfElse(2, ==, 2, IfElse(3, ==, 4, 999, 7), 0), 0)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(7);
  });
});
