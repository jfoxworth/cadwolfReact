import { describe, it, expect } from "vitest";
import { sqrt } from "../../functions/basic/sqrt";
import { runPipeline } from "../../pipeline";
import { ctx } from "../helpers";

describe("sqrt — direct call", () => {
  it("sqrt(0) = 0", async () => {
    expect((await sqrt([{ "0-0": 0 }], ctx("x=0")))["0-0"]).toBeCloseTo(0, 10);
  });
  it("sqrt(1) = 1", async () => {
    expect((await sqrt([{ "0-0": 1 }], ctx("x=0")))["0-0"]).toBeCloseTo(1, 10);
  });
  it("sqrt(4) = 2", async () => {
    expect((await sqrt([{ "0-0": 4 }], ctx("x=0")))["0-0"]).toBeCloseTo(2, 10);
  });
  it("sqrt(9) = 3", async () => {
    expect((await sqrt([{ "0-0": 9 }], ctx("x=0")))["0-0"]).toBeCloseTo(3, 10);
  });
  it("sqrt(2) = √2", async () => {
    expect((await sqrt([{ "0-0": 2 }], ctx("x=0")))["0-0"]).toBeCloseTo(Math.SQRT2, 10);
  });
  it("sqrt(-1) = NaN", async () => {
    expect((await sqrt([{ "0-0": -1 }], ctx("x=0")))["0-0"]).toBeNaN();
  });
  it("row vector element-wise", async () => {
    const r = await sqrt([{ "0-0": 0, "0-1": 1, "0-2": 4, "0-3": 9 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 8);
    expect(r["0-1"]).toBeCloseTo(1, 8);
    expect(r["0-2"]).toBeCloseTo(2, 8);
    expect(r["0-3"]).toBeCloseTo(3, 8);
  });
});

describe("sqrt — pipeline", () => {
  it("x = sqrt(9) → 3", async () => {
    const r = await runPipeline(ctx("x = sqrt(9)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(3, 4);
  });
  it("x = sqrt(2) → √2", async () => {
    const r = await runPipeline(ctx("x = sqrt(2)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.SQRT2, 4);
  });
});
