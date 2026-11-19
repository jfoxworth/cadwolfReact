import { describe, it, expect } from "vitest";
import { eq, solveBlocks } from "../numerical/solve-blocks";

// The sign in a number's exponent belongs to the number. A negative exponent used to be split
// into the operator "-" (and 1.004e-6 read as 1.004 * e - 6), so it failed or gave a wrong value.
describe("scientific notation with a unit", () => {
  it("positive exponent with a space (already worked)", async () => {
    const r = await solveBlocks([eq("E = 250e6 Pa")]);
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(2.5e8, 0);
    expect(r.solution?.units).toBe("Pa");
  });

  it("negative exponent with a space works the same way", async () => {
    const r = await solveBlocks([eq("nu = 1.004e-6 m^2/s")]);
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(1.004e-6, 12);
    expect(r.solution?.baseUnits).toEqual([0, 0, -1, 2, 0, 0, 0, 0]);
  });

  it("capital E and an explicit + sign", async () => {
    const a = await solveBlocks([eq("a = 1.004E-6 m^2/s")]);
    expect(a.errors).toHaveLength(0);
    expect(a.solution?.real["0-0"]).toBeCloseTo(1.004e-6, 12);
    const b = await solveBlocks([eq("b = 2.5e+3 Pa")]);
    expect(b.errors).toHaveLength(0);
    expect(b.solution?.real["0-0"]).toBeCloseTo(2500, 6);
    expect(b.solution?.units).toBe("Pa");
  });
});

describe("scientific notation without a unit", () => {
  it("negative exponent is one number, not 1.004 * e - 6", async () => {
    const r = await solveBlocks([eq("x = 1.004e-6")]);
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(1.004e-6, 12);
  });

  it("works inside expressions", async () => {
    const a = await solveBlocks([eq("a = 5e-3 + 1")]);
    expect(a.solution?.real["0-0"]).toBeCloseTo(1.005, 9);
    const b = await solveBlocks([eq("b = 2*1e-3")]);
    expect(b.solution?.real["0-0"]).toBeCloseTo(0.002, 9);
  });
});

describe("minus signs that are not exponents still subtract", () => {
  it("10-3 is 7", async () => {
    const r = await solveBlocks([eq("w = 10-3")]);
    expect(r.solution?.real["0-0"]).toBeCloseTo(7, 9);
  });

  it("e-3 is Euler's number minus 3, and a variable ending in e before a minus is unchanged", async () => {
    const a = await solveBlocks([eq("q = e-3")]);
    expect(a.solution?.real["0-0"]).toBeCloseTo(Math.E - 3, 4); // the solver's e is 2.71828
    const b = await solveBlocks([eq("s2e = 5"), eq("r = s2e-3")]);
    expect(b.solution?.real["0-0"]).toBeCloseTo(2, 9);
  });
});
