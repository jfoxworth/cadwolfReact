import { describe, it, expect } from "vitest";
import { runPipeline } from "../../pipeline";
import { ctx } from "../helpers";

describe("matrix literal arithmetic", () => {
  it("[1,2,4/2,3] evaluates 4/2 to 2", async () => {
    const r = await runPipeline(ctx("x = [1,2,4/2,3]"));
    console.log("errors:", r.errors);
    console.log("real:", JSON.stringify(r.solution.real));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-2"]).toBeCloseTo(2, 4);
  });

  it("[1,2+1,4/2,3*2] evaluates all expressions", async () => {
    const r = await runPipeline(ctx("x = [1,2+1,4/2,3*2]"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(3, 4);
    expect(r.solution.real["0-2"]).toBeCloseTo(2, 4);
    expect(r.solution.real["0-3"]).toBeCloseTo(6, 4);
  });
});
