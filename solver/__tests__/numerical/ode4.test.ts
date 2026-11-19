import { describe, it, expect } from "vitest";
import { eq, solveBlocks } from "./solve-blocks";

describe("ode4 with units", () => {
  it("integrates a plain-number derivative", async () => {
    const r = await solveBlocks([eq("t = [0, 1, 2]"), eq("y0 = [0]"), eq("y = ode4(t, y0, [3])")]);
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-2"]).toBeCloseTo(6, 6);
  });

  it("gives y the unit of y0 and uses the unit of x", async () => {
    const r = await solveBlocks([
      eq("t = [0, 1, 2]", "s"),
      eq("y0 = [0]", "m"),
      eq("v = 2", "m/s"),
      eq("y = ode4(t, y0, [v])"),
    ]);
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-2"]).toBeCloseTo(4, 6);
    expect(r.solution?.units).toBe("m");
  });

  it("reports a unit error in the derivative instead of returning a wrong answer", async () => {
    const r = await solveBlocks([
      eq("t = [0, 1, 2]", "s"),
      eq("y0 = [0]", "m"),
      eq("v = 2", "m/s"),
      eq("y = ode4(t, y0, [v + x])"),
    ]);
    expect(r.errors.length).toBeGreaterThan(0);
  });
});
