import { describe, it, expect } from "vitest";
import { eq, solveBlocks } from "./solve-blocks";

describe("bisect with units", () => {
  it("finds the root of a plain-number function", async () => {
    const r = await solveBlocks([eq("r = bisect(x^2 - 2, 0, 5)")]);
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(1.41421, 3);
  });

  it("takes the unit of x from the bounds, so a variable in metres can be used with x", async () => {
    const r = await solveBlocks([eq("zA = 73", "m"), eq("r = bisect(zA - x, 0m, 200m)")]);
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(73, 2);
    expect(r.solution?.units).toBe("m");
  });

  it("converts bounds written in another unit (values are SI)", async () => {
    const r = await solveBlocks([eq("zA = 73", "m"), eq("r = bisect(zA - x, 0mm, 200000mm)")]);
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(73, 2);
    expect(r.solution?.units).toBe("m");
  });

  it("reports a unit error instead of returning a wrong root", async () => {
    const r = await solveBlocks([eq("zA = 73", "m"), eq("r = bisect(zA - x, 0, 200)")]);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("rejects bounds with different units", async () => {
    const r = await solveBlocks([eq("r = bisect(x, 0m, 5s)")]);
    expect(r.errors.length).toBeGreaterThan(0);
  });
});

describe("bisect on a three-reservoir junction (units throughout)", () => {
  const Q = (z: string, d: string, l: string) =>
    `sign(${z} - x) * pi * ${d}^2 / 4 * 2 * sqrt(8 * grav * ${d} * abs(${z} - x) / ${l}) * (-log10(eps_rough / (3.7 * ${d}) + 2.51 * nu_water / (${d} * sqrt(8 * grav * ${d} * abs(${z} - x) / ${l}))))`;

  it("finds the junction head in metres with no unit error", async () => {
    const r = await solveBlocks([
      eq("Z_A = 100", "m"), eq("Z_B = 80", "m"), eq("Z_C = 50", "m"),
      eq("D_A = 300", "mm"), eq("D_B = 250", "mm"), eq("D_C = 200", "mm"),
      eq("L_A = 1000", "m"), eq("L_B = 800", "m"), eq("L_C = 1200", "m"),
      eq("eps_rough = 0.26", "mm"), eq("nu_water = 0.000001004", "m^2/s"),
      eq(`bis = bisect(${Q("Z_A", "D_A", "L_A")} + ${Q("Z_B", "D_B", "L_B")} + ${Q("Z_C", "D_C", "L_C")}, 81m, 99m, 0.001, 100)`),
    ]);
    expect(r.errors).toHaveLength(0);
    const head = r.solution?.real["0-0"] ?? 0;
    expect(head).toBeGreaterThan(81);
    expect(head).toBeLessThan(99);
    expect(r.solution?.units).toBe("m");
  }, 120000);
});
