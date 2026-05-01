import { describe, it, expect } from "vitest";
import { runPipeline } from "../../pipeline";
import { ctx } from "../helpers";
import type { SolveContext } from "../../types";

const emptyBase: [number,number,number,number,number,number,number,number] = [0,0,0,0,0,0,0,0];

// Build a context with A (n×n) and b (n×1) already solved and in scope
function ctxWithAb(A: Record<string,number>, Asize: string, b: Record<string,number>, bsize: string, equation: string): SolveContext {
  return {
    ...ctx(equation),
    documentEquations: [
      { blockId: "A", order: 0, variableName: "A", solution: { real: A, imag: {}, size: Asize, units: "", baseUnits: emptyBase, multiplier: 1 }, error: null },
      { blockId: "b", order: 1, variableName: "b", solution: { real: b, imag: {}, size: bsize, units: "", baseUnits: emptyBase, multiplier: 1 }, error: null },
    ],
    currentBlockOrder: 2,
  };
}

describe("gaussE — Gaussian elimination with partial pivoting", () => {

  it("2×2 simple: [2,1;5,7]*x = [11;13] → x = [7.11, -3.22]", async () => {
    // Solution: x0 = 58/11 ≈ 5.2727, x1 = 9/11 ≈ 0.8182
    // A = [2,1;5,7], b = [11;13]
    // By hand: x1 = (13*2 - 11*5)/(7*2-1*5) = (26-55)/(14-5) = -29/9 ≈ -3.222  <-- let's use a cleaner system
    // Use: [1,2;3,4]*x=[5;6] → x=[-4,4.5]  ... actually [-4, 4.5] check: 1*(-4)+2*4.5=5 ✓, 3*(-4)+4*4.5=6 ✓
    const A = { "0-0":1,"0-1":2,"1-0":3,"1-1":4 };
    const b = { "0-0":5,"1-0":6 };
    const r = await runPipeline(ctxWithAb(A, "2x2", b, "2x1", "x = gaussE(A, b)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.size).toBe("2x1");
    expect(r.solution.real["0-0"]).toBeCloseTo(-4, 6);
    expect(r.solution.real["1-0"]).toBeCloseTo(4.5, 6);
  });

  it("3×3 diagonal: identity * x = [3;1;4] → x = [3;1;4]", async () => {
    const A = { "0-0":1,"0-1":0,"0-2":0,"1-0":0,"1-1":1,"1-2":0,"2-0":0,"2-1":0,"2-2":1 };
    const b = { "0-0":3,"1-0":1,"2-0":4 };
    const r = await runPipeline(ctxWithAb(A, "3x3", b, "3x1", "x = gaussE(A, b)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(3, 6);
    expect(r.solution.real["1-0"]).toBeCloseTo(1, 6);
    expect(r.solution.real["2-0"]).toBeCloseTo(4, 6);
  });

  it("3×3 known system: [2,-1,0;-1,2,-1;0,-1,2]*x=[1;0;1] → x=[1,1,1]", async () => {
    // Tridiagonal — common in FEM. Solution is all ones.
    // Check: 2(1)-1(1)=1 ✓, -1(1)+2(1)-1(1)=0 ✓, -1(1)+2(1)=1 ✓
    const A = { "0-0":2,"0-1":-1,"0-2":0,"1-0":-1,"1-1":2,"1-2":-1,"2-0":0,"2-1":-1,"2-2":2 };
    const b = { "0-0":1,"1-0":0,"2-0":1 };
    const r = await runPipeline(ctxWithAb(A, "3x3", b, "3x1", "x = gaussE(A, b)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 6);
    expect(r.solution.real["1-0"]).toBeCloseTo(1, 6);
    expect(r.solution.real["2-0"]).toBeCloseTo(1, 6);
  });

  it("3×3 requires pivoting: [0,1,0;1,0,0;0,0,1]*x=[2;1;3] → x=[1;2;3]", async () => {
    // First row has zero on diagonal — requires pivot swap
    const A = { "0-0":0,"0-1":1,"0-2":0,"1-0":1,"1-1":0,"1-2":0,"2-0":0,"2-1":0,"2-2":1 };
    const b = { "0-0":2,"1-0":1,"2-0":3 };
    const r = await runPipeline(ctxWithAb(A, "3x3", b, "3x1", "x = gaussE(A, b)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 6);
    expect(r.solution.real["1-0"]).toBeCloseTo(2, 6);
    expect(r.solution.real["2-0"]).toBeCloseTo(3, 6);
  });

  it("4×4 symmetric positive definite", async () => {
    // A = [4,1,0,0;1,4,1,0;0,1,4,1;0,0,1,4], b = [5;6;6;5]
    // Solution by symmetry: x = [1,1,1,1]
    // Check: 4+1=5 ✓, 1+4+1=6 ✓, 1+4+1=6 ✓, 1+4=5 ✓
    const A = {
      "0-0":4,"0-1":1,"0-2":0,"0-3":0,
      "1-0":1,"1-1":4,"1-2":1,"1-3":0,
      "2-0":0,"2-1":1,"2-2":4,"2-3":1,
      "3-0":0,"3-1":0,"3-2":1,"3-3":4,
    };
    const b = { "0-0":5,"1-0":6,"2-0":6,"3-0":5 };
    const r = await runPipeline(ctxWithAb(A, "4x4", b, "4x1", "x = gaussE(A, b)"));
    expect(r.errors).toHaveLength(0);
    for (let i = 0; i < 4; i++) {
      expect(r.solution.real[`${i}-0`]).toBeCloseTo(1, 6);
    }
  });

  it("result is n×1 column vector", async () => {
    const A = { "0-0":2,"0-1":0,"1-0":0,"1-1":3 };
    const b = { "0-0":4,"1-0":9 };
    const r = await runPipeline(ctxWithAb(A, "2x2", b, "2x1", "x = gaussE(A, b)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.size).toBe("2x1");
    expect(r.solution.real["0-0"]).toBeCloseTo(2, 6);
    expect(r.solution.real["1-0"]).toBeCloseTo(3, 6);
  });

});
