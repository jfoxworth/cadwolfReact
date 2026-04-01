import { describe, it, expect } from "vitest";
import { runPipeline } from "../../pipeline";
import { ctx } from "../helpers";
import type { ResolvedEquation } from "../../types";

const emptyBase: [number,number,number,number,number,number,number,number] = [0,0,0,0,0,0,0,0];

describe("power vector", () => {
  it("power(x, 2) squares each element of a row vector", async () => {
    // x = [1, 2, 3] as a row vector
    const xSol = {
      real: { "0-0": 1, "0-1": 2, "0-2": 3 },
      imag: {},
      size: "1x3",
      units: "", baseUnits: emptyBase, multiplier: 1, quantity: ""
    };
    const xEq: ResolvedEquation = { blockId: "x", order: -1, variableName: "x", solution: xSol, error: null };

    const c = ctx("y = power(2, x)");
    c.documentEquations = [xEq];
    c.currentBlockOrder = 0;
    const res = await runPipeline(c);
    console.log("errors:", res.errors);
    console.log("keys:", Object.keys(res.solution.real));
    console.log("result:", res.solution.real);
    expect(res.errors).toHaveLength(0);
    expect(Object.keys(res.solution.real)).toHaveLength(3);
    expect(res.solution.real["0-0"]).toBeCloseTo(1, 4);
    expect(res.solution.real["0-1"]).toBeCloseTo(4, 4);
    expect(res.solution.real["0-2"]).toBeCloseTo(9, 4);
  });

  it("x^2 squares each element of a row vector", async () => {
    const xSol = {
      real: { "0-0": 1, "0-1": 2, "0-2": 3 },
      imag: {},
      size: "1x3",
      units: "", baseUnits: emptyBase, multiplier: 1, quantity: ""
    };
    const xEq: ResolvedEquation = { blockId: "x", order: -1, variableName: "x", solution: xSol, error: null };

    const c = ctx("y = x^2");
    c.documentEquations = [xEq];
    c.currentBlockOrder = 0;
    const res = await runPipeline(c);
    console.log("errors:", res.errors);
    console.log("keys:", Object.keys(res.solution.real));
    console.log("result:", res.solution.real);
    expect(res.errors).toHaveLength(0);
    expect(Object.keys(res.solution.real)).toHaveLength(3);
    expect(res.solution.real["0-0"]).toBeCloseTo(1, 4);
    expect(res.solution.real["0-1"]).toBeCloseTo(4, 4);
    expect(res.solution.real["0-2"]).toBeCloseTo(9, 4);
  });
});
