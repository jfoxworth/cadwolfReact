import { describe, it, expect } from "vitest";
import { runPipeline } from "../../pipeline";
import { ctx } from "../helpers";

describe("root with units", () => {
  it("root(2, 9m^2) = 3 m  [unit preserved]", async () => {
    const r = await runPipeline(ctx("x = root(2,9m^2)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(3, 4);
    expect(r.solution.baseUnits[3]).toBe(1);   // m^1
    expect(r.solution.units).toBe("m");
  });

  it("root(2, 4m^2/s^2) = 2 m/s", async () => {
    const r = await runPipeline(ctx("x = root(2,4m^2/s^2)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(2, 4);
    expect(r.solution.baseUnits[3]).toBe(1);   // m^1
    expect(r.solution.baseUnits[2]).toBe(-1);  // s^-1
  });
});
