import { describe, it, expect } from "vitest";
import { hypot } from "../../functions/basic/hypot";
import { runPipeline } from "../../pipeline";
import { ctx } from "../helpers";

describe("hypot — direct call", () => {
  it("hypot(3, 4) = 5", async () => {
    expect((await hypot([{ "0-0": 3 }, { "0-0": 4 }], ctx("x=0")))["0-0"]).toBeCloseTo(5, 10);
  });
  it("hypot(0, 0) = 0", async () => {
    expect((await hypot([{ "0-0": 0 }, { "0-0": 0 }], ctx("x=0")))["0-0"]).toBeCloseTo(0, 10);
  });
  it("hypot(1, 0) = 1", async () => {
    expect((await hypot([{ "0-0": 1 }, { "0-0": 0 }], ctx("x=0")))["0-0"]).toBeCloseTo(1, 10);
  });
  it("hypot(5, 12) = 13", async () => {
    expect((await hypot([{ "0-0": 5 }, { "0-0": 12 }], ctx("x=0")))["0-0"]).toBeCloseTo(13, 8);
  });
  it("hypot(-3, 4) = 5 (negative component)", async () => {
    expect((await hypot([{ "0-0": -3 }, { "0-0": 4 }], ctx("x=0")))["0-0"]).toBeCloseTo(5, 10);
  });
});

describe("hypot — pipeline", () => {
  it("x = hypot(3, 4) → 5", async () => {
    const r = await runPipeline(ctx("x = hypot(3, 4)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(5, 4);
  });
});
