import { describe, it, expect } from "vitest";
import { runPipeline } from "../../pipeline";
import { ctx } from "../helpers";

describe("ln", () => {
  it("ln(1) = 0", async () => {
    const r = await runPipeline(ctx("x = ln(1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });

  it("ln(e) ≈ 1", async () => {
    const r = await runPipeline(ctx("x = ln(2.718281828)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
  });

  it("ln(10) ≈ 2.3026", async () => {
    const r = await runPipeline(ctx("x = ln(10)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(2.3026, 4);
  });
});

describe("log10", () => {
  it("log10(1) = 0", async () => {
    const r = await runPipeline(ctx("x = log10(1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });

  it("log10(10) = 1", async () => {
    const r = await runPipeline(ctx("x = log10(10)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
  });

  it("log10(100) = 2", async () => {
    const r = await runPipeline(ctx("x = log10(100)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(2, 4);
  });

  it("log10(0.1) = -1", async () => {
    const r = await runPipeline(ctx("x = log10(0.1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(-1, 4);
  });
});

describe("root", () => {
  it("root(2,4) = 2  [sqrt(4)]", async () => {
    const r = await runPipeline(ctx("x = root(2,4)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(2, 4);
  });

  it("root(3,8) = 2  [cbrt(8)]", async () => {
    const r = await runPipeline(ctx("x = root(3,8)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(2, 4);
  });

  it("root(3,27) = 3", async () => {
    const r = await runPipeline(ctx("x = root(3,27)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(3, 4);
  });

  it("root(4,16) = 2  [4th root of 16]", async () => {
    const r = await runPipeline(ctx("x = root(4,16)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(2, 4);
  });
});

describe("power", () => {
  it("power(3,2) = 8  [2^3]", async () => {
    const r = await runPipeline(ctx("x = power(3,2)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(8, 4);
  });

  it("power(0.5,4) = 2  [4^0.5]", async () => {
    const r = await runPipeline(ctx("x = power(0.5,4)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(2, 4);
  });

  it("power(2,10) = 100  [10^2]", async () => {
    const r = await runPipeline(ctx("x = power(2,10)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(100, 4);
  });

});
