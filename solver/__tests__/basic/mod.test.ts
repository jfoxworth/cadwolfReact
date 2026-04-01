import { describe, it, expect } from "vitest";
import { mod } from "../../functions/basic/mod";
import { runPipeline } from "../../pipeline";
import { ctx } from "../helpers";

describe("mod — direct call", () => {
  it("mod(7, 3) = 1", async () => {
    expect((await mod([{ "0-0": 7 }, { "0-0": 3 }], ctx("x=0")))["0-0"]).toBeCloseTo(1, 10);
  });
  it("mod(6, 3) = 0", async () => {
    expect((await mod([{ "0-0": 6 }, { "0-0": 3 }], ctx("x=0")))["0-0"]).toBeCloseTo(0, 10);
  });
  it("mod(-1, 3) = 2 (always non-negative)", async () => {
    expect((await mod([{ "0-0": -1 }, { "0-0": 3 }], ctx("x=0")))["0-0"]).toBeCloseTo(2, 10);
  });
  it("mod(-7, 3) = 2", async () => {
    expect((await mod([{ "0-0": -7 }, { "0-0": 3 }], ctx("x=0")))["0-0"]).toBeCloseTo(2, 10);
  });
  it("mod(7, -3) = -2 (sign of divisor)", async () => {
    expect((await mod([{ "0-0": 7 }, { "0-0": -3 }], ctx("x=0")))["0-0"]).toBeCloseTo(-2, 10);
  });
  it("row vector element-wise", async () => {
    const r = await mod([{ "0-0": 7, "0-1": 8, "0-2": 9 }, { "0-0": 3 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 8);
    expect(r["0-1"]).toBeCloseTo(2, 8);
    expect(r["0-2"]).toBeCloseTo(0, 8);
  });
});

describe("mod — pipeline", () => {
  it("x = mod(10, 3) → 1", async () => {
    const r = await runPipeline(ctx("x = mod(10, 3)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
  });
  it("x = mod(-1, 5) → 4", async () => {
    const r = await runPipeline(ctx("x = mod(-1, 5)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(4, 4);
  });
});
