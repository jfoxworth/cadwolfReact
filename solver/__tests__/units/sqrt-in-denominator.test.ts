import { describe, it, expect } from "vitest";
import { eq, solveBlocks } from "../numerical/solve-blocks";

// A sqrt (or root, or power) result carries a derived unit. These cover that unit inside a
// product that is divided, and when the result is dimensionless or added to something.
const base = [
  eq("D = 300", "mm"),
  eq("h = 19", "m"),
  eq("g2 = 9.81", "m/s^2"),
  eq("nu = 0.000001004", "m^2/s"),
  eq("eps = 0.26", "mm"),
];
const flat = (b?: number[]) => (b ?? []).map((v) => v + 0);

describe("sqrt in a divided product keeps its unit", () => {
  it("nu / (D * sqrt(g2*h)) is dimensionless", async () => {
    const r = await solveBlocks([...base, eq("a = nu / (D * sqrt(g2*h))")]);
    expect(r.errors).toHaveLength(0);
    expect(flat(r.solution?.baseUnits)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it("the same quotient can be added to a dimensionless ratio", async () => {
    const r = await solveBlocks([...base, eq("a = eps / (3.7 * D) + 2.51 * nu / (D * sqrt(g2*h))")]);
    expect(r.errors).toHaveLength(0);
    expect(flat(r.solution?.baseUnits)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it("a variable in place of the sqrt gives the same dimensionless result", async () => {
    const r = await solveBlocks([...base, eq("v = sqrt(g2*h)"), eq("a = nu / (D * v)")]);
    expect(r.errors).toHaveLength(0);
    expect(flat(r.solution?.baseUnits)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it("sqrt alone, multiplied, and divided keep their units", async () => {
    const alone = await solveBlocks([...base, eq("a = sqrt(g2*h)")]);
    expect(flat(alone.solution?.baseUnits)).toEqual([0, 0, -1, 1, 0, 0, 0, 0]); // m/s
    const times = await solveBlocks([...base, eq("a = D * sqrt(g2*h)")]);
    expect(flat(times.solution?.baseUnits)).toEqual([0, 0, -1, 2, 0, 0, 0, 0]); // m^2/s
    const over = await solveBlocks([...base, eq("a = nu / sqrt(g2*h)")]);
    expect(flat(over.solution?.baseUnits)).toEqual([0, 0, 0, 1, 0, 0, 0, 0]); // m
  });

  it("a quotient that really has a unit is still not addable to a dimensionless value", async () => {
    const r = await solveBlocks([...base, eq("a = eps / (3.7 * D) + nu / D")]);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("two terms with different units still cannot be added", async () => {
    const r = await solveBlocks([...base, eq("a = h + nu / (D * sqrt(g2*h))")]);
    expect(r.errors.length).toBeGreaterThan(0);
  });
});
