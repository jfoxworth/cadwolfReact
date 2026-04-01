import { describe, it, expect } from "vitest";
import { trapz } from "../../functions/calculus/trapz";
import { cumtrapz } from "../../functions/calculus/cumtrapz";
import { ctx } from "../helpers";

describe("trapz — direct call: unit spacing", () => {
  it("[1, 1] → 1 (rectangle of height 1, width 1)", async () => {
    const r = await trapz([{ "0-0": 1, "0-1": 1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
  });
  it("[0, 1] → 0.5 (triangle)", async () => {
    const r = await trapz([{ "0-0": 0, "0-1": 1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0.5, 10);
  });
  it("[0, 1, 2, 3] with unit spacing → 4.5", async () => {
    const r = await trapz([{ "0-0": 0, "0-1": 1, "0-2": 2, "0-3": 3 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(4.5, 10);
  });
  it("constant [2, 2, 2] → 4 (area of rectangle 2×2)", async () => {
    const r = await trapz([{ "0-0": 2, "0-1": 2, "0-2": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(4, 10);
  });
  it("single element → 0", async () => {
    const r = await trapz([{ "0-0": 5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });
});

describe("trapz — direct call: with x values", () => {
  it("y=[0,1] x=[0,2] → 1 (triangle with base 2)", async () => {
    const r = await trapz([{ "0-0": 0, "0-1": 1 }, { "0-0": 0, "0-1": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
  });
  it("y=[1,1] x=[0,5] → 5 (rectangle)", async () => {
    const r = await trapz([{ "0-0": 1, "0-1": 1 }, { "0-0": 0, "0-1": 5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(5, 10);
  });
  it("integral of sin(x) from 0 to π ≈ 2 (many points)", async () => {
    const n = 1000;
    const y: Record<string, number> = {};
    const x: Record<string, number> = {};
    for (let i = 0; i <= n; i++) {
      const xi = (Math.PI * i) / n;
      y[`0-${i}`] = Math.sin(xi);
      x[`0-${i}`] = xi;
    }
    const r = await trapz([y, x], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(2, 3);
  });
});

describe("cumtrapz — direct call", () => {
  it("[1, 1, 1] with unit spacing → [0, 1, 2]", async () => {
    const r = await cumtrapz([{ "0-0": 1, "0-1": 1, "0-2": 1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
    expect(r["0-1"]).toBeCloseTo(1, 10);
    expect(r["0-2"]).toBeCloseTo(2, 10);
  });
  it("[0, 2, 4] with unit spacing → [0, 1, 4]", async () => {
    const r = await cumtrapz([{ "0-0": 0, "0-1": 2, "0-2": 4 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
    expect(r["0-1"]).toBeCloseTo(1, 10);
    expect(r["0-2"]).toBeCloseTo(4, 10);
  });
  it("output same length as input", async () => {
    const v = { "0-0": 1, "0-1": 2, "0-2": 3, "0-3": 4 };
    const r = await cumtrapz([v], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(4);
  });
  it("first element always 0", async () => {
    const r = await cumtrapz([{ "0-0": 99, "0-1": 100 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });
});
