import { describe, it, expect } from "vitest";
import { runPipeline } from "../../pipeline";
import { ctx } from "../helpers";

describe("Range vector [start:stop]", () => {
  it("[1:5] produces 1x5 row vector", async () => {
    const r = await runPipeline(ctx("v = [1:5]"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.size).toBe("1x5");
    expect(r.solution.real["0-0"]).toBeCloseTo(1);
    expect(r.solution.real["0-1"]).toBeCloseTo(2);
    expect(r.solution.real["0-2"]).toBeCloseTo(3);
    expect(r.solution.real["0-3"]).toBeCloseTo(4);
    expect(r.solution.real["0-4"]).toBeCloseTo(5);
  });

  it("[0:3] produces 1x4 row vector starting at 0", async () => {
    const r = await runPipeline(ctx("v = [0:3]"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.size).toBe("1x4");
    expect(r.solution.real["0-0"]).toBeCloseTo(0);
    expect(r.solution.real["0-3"]).toBeCloseTo(3);
  });
});

describe("Range vector [start:step:stop]", () => {
  it("[0:2:10] produces 1x6 even-integer vector", async () => {
    const r = await runPipeline(ctx("v = [0:2:10]"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.size).toBe("1x6");
    expect(r.solution.real["0-0"]).toBeCloseTo(0);
    expect(r.solution.real["0-1"]).toBeCloseTo(2);
    expect(r.solution.real["0-2"]).toBeCloseTo(4);
    expect(r.solution.real["0-5"]).toBeCloseTo(10);
  });

  it("[0:0.5:2] produces 1x5 fractional-step vector", async () => {
    const r = await runPipeline(ctx("v = [0:0.5:2]"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.size).toBe("1x5");
    expect(r.solution.real["0-0"]).toBeCloseTo(0);
    expect(r.solution.real["0-1"]).toBeCloseTo(0.5);
    expect(r.solution.real["0-2"]).toBeCloseTo(1);
    expect(r.solution.real["0-3"]).toBeCloseTo(1.5);
    expect(r.solution.real["0-4"]).toBeCloseTo(2);
  });

  it("[10:(-1):7] produces descending vector", async () => {
    const r = await runPipeline(ctx("v = [10:(-1):7]"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.size).toBe("1x4");
    expect(r.solution.real["0-0"]).toBeCloseTo(10);
    expect(r.solution.real["0-1"]).toBeCloseTo(9);
    expect(r.solution.real["0-2"]).toBeCloseTo(8);
    expect(r.solution.real["0-3"]).toBeCloseTo(7);
  });

  it("[1:1:1] produces single-element vector", async () => {
    const r = await runPipeline(ctx("v = [1:1:1]"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.size).toBe("1x1");
    expect(r.solution.real["0-0"]).toBeCloseTo(1);
  });
});

describe("Range vector arithmetic", () => {
  it("2 * [1:3] scales the vector", async () => {
    const r = await runPipeline(ctx("v = 2 * [1:3]"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.size).toBe("1x3");
    expect(r.solution.real["0-0"]).toBeCloseTo(2);
    expect(r.solution.real["0-1"]).toBeCloseTo(4);
    expect(r.solution.real["0-2"]).toBeCloseTo(6);
  });

  it("[1:3] + [4:6] adds element-wise", async () => {
    const r = await runPipeline(ctx("v = [1:3] + [4:6]"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.size).toBe("1x3");
    expect(r.solution.real["0-0"]).toBeCloseTo(5);
    expect(r.solution.real["0-1"]).toBeCloseTo(7);
    expect(r.solution.real["0-2"]).toBeCloseTo(9);
  });
});
