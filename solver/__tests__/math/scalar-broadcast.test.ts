import { describe, it, expect } from "vitest";
import { runPipeline } from "../../pipeline";
import { ctx } from "../helpers";
import type { ResolvedEquation } from "../../types";

const emptyBase: [number,number,number,number,number,number,number,number] = [0,0,0,0,0,0,0,0];

function scalarEq(blockId: string, name: string, value: number, order = -1): ResolvedEquation {
  return {
    blockId, order, variableName: name,
    solution: { real: { "0-0": value }, imag: {}, size: "1x1", units: "", baseUnits: emptyBase, multiplier: 1, quantity: "" },
    error: null,
  };
}

function vecEq(blockId: string, name: string, values: number[], order = -2): ResolvedEquation {
  const real: Record<string, number> = {};
  values.forEach((v, i) => { real[`0-${i}`] = v; });
  return {
    blockId, order, variableName: name,
    solution: { real, imag: {}, size: `1x${values.length}`, units: "", baseUnits: emptyBase, multiplier: 1, quantity: "" },
    error: null,
  };
}

// x = [-1, 0, 1], c = 3
const xVec = vecEq("x", "x", [-1, 0, 1]);
const cScalar = scalarEq("c", "c", 3);

describe("scalar variable broadcast with vectors", () => {
  it("vector + scalar_var: x + c adds c to every element", async () => {
    const c = ctx("y = x + c");
    c.documentEquations = [xVec, cScalar];
    c.currentBlockOrder = 1;
    const res = await runPipeline(c);
    expect(res.errors).toHaveLength(0);
    expect(res.solution.size).toBe("1x3");
    expect(res.solution.real["0-0"]).toBeCloseTo(2, 10);  // -1 + 3
    expect(res.solution.real["0-1"]).toBeCloseTo(3, 10);  //  0 + 3
    expect(res.solution.real["0-2"]).toBeCloseTo(4, 10);  //  1 + 3
  });

  it("scalar_var + vector: c + x adds c to every element", async () => {
    const c = ctx("y = c + x");
    c.documentEquations = [xVec, cScalar];
    c.currentBlockOrder = 1;
    const res = await runPipeline(c);
    expect(res.errors).toHaveLength(0);
    expect(res.solution.size).toBe("1x3");
    expect(res.solution.real["0-0"]).toBeCloseTo(2, 10);
    expect(res.solution.real["0-1"]).toBeCloseTo(3, 10);
    expect(res.solution.real["0-2"]).toBeCloseTo(4, 10);
  });

  it("vector - scalar_var: x - c subtracts c from every element", async () => {
    const c = ctx("y = x - c");
    c.documentEquations = [xVec, cScalar];
    c.currentBlockOrder = 1;
    const res = await runPipeline(c);
    expect(res.errors).toHaveLength(0);
    expect(res.solution.size).toBe("1x3");
    expect(res.solution.real["0-0"]).toBeCloseTo(-4, 10);  // -1 - 3
    expect(res.solution.real["0-1"]).toBeCloseTo(-3, 10);  //  0 - 3
    expect(res.solution.real["0-2"]).toBeCloseTo(-2, 10);  //  1 - 3
  });

  it("scalar_var - vector: c - x subtracts each element from c", async () => {
    const c = ctx("y = c - x");
    c.documentEquations = [xVec, cScalar];
    c.currentBlockOrder = 1;
    const res = await runPipeline(c);
    expect(res.errors).toHaveLength(0);
    expect(res.solution.size).toBe("1x3");
    expect(res.solution.real["0-0"]).toBeCloseTo(4, 10);   // 3 - (-1)
    expect(res.solution.real["0-1"]).toBeCloseTo(3, 10);   // 3 - 0
    expect(res.solution.real["0-2"]).toBeCloseTo(2, 10);   // 3 - 1
  });

  it("vector * scalar_var: x * c scales every element", async () => {
    const c = ctx("y = x * c");
    c.documentEquations = [xVec, cScalar];
    c.currentBlockOrder = 1;
    const res = await runPipeline(c);
    expect(res.errors).toHaveLength(0);
    expect(res.solution.size).toBe("1x3");
    expect(res.solution.real["0-0"]).toBeCloseTo(-3, 10);  // -1 * 3
    expect(res.solution.real["0-1"]).toBeCloseTo(0, 10);
    expect(res.solution.real["0-2"]).toBeCloseTo(3, 10);   //  1 * 3
  });

  it("scalar_var * vector: c * x scales every element", async () => {
    const c = ctx("y = c * x");
    c.documentEquations = [xVec, cScalar];
    c.currentBlockOrder = 1;
    const res = await runPipeline(c);
    expect(res.errors).toHaveLength(0);
    expect(res.solution.size).toBe("1x3");
    expect(res.solution.real["0-0"]).toBeCloseTo(-3, 10);
    expect(res.solution.real["0-1"]).toBeCloseTo(0, 10);
    expect(res.solution.real["0-2"]).toBeCloseTo(3, 10);
  });

  it("quadratic y = a*x^2 + b*x + c evaluates correctly across all elements", async () => {
    // a=1, b=2, c=3, x=[-1, 0, 1]
    // y[-1] = 1*1 + 2*(-1) + 3 = 2
    // y[0]  = 0 + 0 + 3 = 3
    // y[1]  = 1 + 2 + 3 = 6
    const aEq = scalarEq("a", "a", 1);
    const bEq = scalarEq("b", "b", 2);
    const c = ctx("y = a*x^2 + b*x + c");
    c.documentEquations = [aEq, bEq, cScalar, xVec];
    c.currentBlockOrder = 1;
    const res = await runPipeline(c);
    expect(res.errors).toHaveLength(0);
    expect(res.solution.size).toBe("1x3");
    expect(res.solution.real["0-0"]).toBeCloseTo(2, 10);
    expect(res.solution.real["0-1"]).toBeCloseTo(3, 10);
    expect(res.solution.real["0-2"]).toBeCloseTo(6, 10);
  });

  it("changing a scalar coefficient propagates to all vector elements", async () => {
    // Same quadratic with a=2 instead of a=1
    // y[-1] = 2*1 + 2*(-1) + 3 = 3
    // y[0]  = 0 + 0 + 3 = 3
    // y[1]  = 2 + 2 + 3 = 7
    const aEq = scalarEq("a", "a", 2);
    const bEq = scalarEq("b", "b", 2);
    const c = ctx("y = a*x^2 + b*x + c");
    c.documentEquations = [aEq, bEq, cScalar, xVec];
    c.currentBlockOrder = 1;
    const res = await runPipeline(c);
    expect(res.errors).toHaveLength(0);
    expect(res.solution.size).toBe("1x3");
    expect(res.solution.real["0-0"]).toBeCloseTo(3, 10);
    expect(res.solution.real["0-1"]).toBeCloseTo(3, 10);
    expect(res.solution.real["0-2"]).toBeCloseTo(7, 10);
  });
});
