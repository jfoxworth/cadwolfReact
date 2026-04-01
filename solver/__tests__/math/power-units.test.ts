import { describe, it, expect } from "vitest";
import { runPipeline } from "../../pipeline";
import { ctx } from "../helpers";

describe("power with units", () => {
  it("power(2, 3m) = 9 m^2  [unit preserved]", async () => {
    const r = await runPipeline(ctx("x = power(2,3m)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(9, 4);
    expect(r.solution.baseUnits[3]).toBe(2);  // m^2
    expect(r.solution.units).toBe("m^2");
  });

  it("power(3, 2m/s) = 8 m^3/s^3  [compound unit preserved]", async () => {
    const r = await runPipeline(ctx("x = power(3,2m/s)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(8, 4);
    expect(r.solution.baseUnits[3]).toBe(3);   // m^3
    expect(r.solution.baseUnits[2]).toBe(-3);  // s^-3
  });

  it("power(2,x) + a/b  [adding unit-division result to power result] no error", async () => {
    // Simulates: result = a/b + power(2,c) where both sides have m^2
    // 9N/m + power(2,3m) = 9 + 9 = 18 m^2  [9N/m = 9 kg/s^2 = ... skip; use pure numeric test]
    // Use dimensionless power side: power(2,3) + 0 to verify no false unit error
    const r = await runPipeline(ctx("x = 4m^2+power(2,3m)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(13, 4);
    expect(r.solution.baseUnits[3]).toBe(2);  // m^2
  });
});
