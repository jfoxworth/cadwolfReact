import { describe, it, expect } from "vitest";
import { eq, solveBlocks } from "./solve-blocks";

describe("incsearch with units", () => {
  it("finds the bracket of a plain-number function", async () => {
    const r = await solveBlocks([eq("b = incsearch(x - 2.55, 0, 5, 50)")]);
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeLessThan(2.55);
    expect(r.solution?.real["0-1"]).toBeGreaterThan(2.55);
  });

  it("takes the unit of x from the bounds and returns the bracket in that unit", async () => {
    const r = await solveBlocks([eq("zA = 73.5", "m"), eq("b = incsearch(zA - x, 0m, 200m, 100)")]);
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeLessThan(73.5);
    expect(r.solution?.real["0-1"]).toBeGreaterThan(73.5);
    expect(r.solution?.units).toBe("m");
  });

  it("reports a unit error instead of returning no bracket", async () => {
    const r = await solveBlocks([eq("zA = 73.5", "m"), eq("b = incsearch(zA - x, 0, 200, 100)")]);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("rejects bounds with different units", async () => {
    const r = await solveBlocks([eq("b = incsearch(x, 0m, 5s, 10)")]);
    expect(r.errors.length).toBeGreaterThan(0);
  });
});
