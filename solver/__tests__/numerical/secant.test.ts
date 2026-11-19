import { describe, it, expect } from "vitest";
import { eq, solveBlocks } from "./solve-blocks";

describe("secant with units", () => {
  it("finds the root of a plain-number function", async () => {
    const r = await solveBlocks([eq("r = secant(x^2 - 2, 1, 3)")]);
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(1.41421, 3);
  });

  it("takes the unit of x from the bounds, so a variable in metres can be used with x", async () => {
    const r = await solveBlocks([eq("zA = 73", "m"), eq("r = secant(zA - x, 10m, 20m)")]);
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(73, 2);
    expect(r.solution?.units).toBe("m");
  });

  it("converts bounds written in another unit (values are SI)", async () => {
    const r = await solveBlocks([eq("zA = 73", "m"), eq("r = secant(zA - x, 10000mm, 20000mm)")]);
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(73, 2);
    expect(r.solution?.units).toBe("m");
  });

  it("reports a unit error instead of returning a wrong root", async () => {
    const r = await solveBlocks([eq("zA = 73", "m"), eq("r = secant(zA - x, 0, 200)")]);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("rejects bounds with different units", async () => {
    const r = await solveBlocks([eq("r = secant(x, 1m, 5s)")]);
    expect(r.errors.length).toBeGreaterThan(0);
  });
});
