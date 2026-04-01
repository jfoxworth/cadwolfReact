import { describe, it, expect } from "vitest";
import { lcm } from "../../functions/basic/lcm";
import { runPipeline } from "../../pipeline";
import { ctx } from "../helpers";

describe("lcm — direct call", () => {
  it("lcm(4, 6) = 12", async () => {
    expect((await lcm([{ "0-0": 4 }, { "0-0": 6 }], ctx("x=0")))["0-0"]).toBe(12);
  });
  it("lcm(3, 7) = 21 (coprime)", async () => {
    expect((await lcm([{ "0-0": 3 }, { "0-0": 7 }], ctx("x=0")))["0-0"]).toBe(21);
  });
  it("lcm(5, 5) = 5", async () => {
    expect((await lcm([{ "0-0": 5 }, { "0-0": 5 }], ctx("x=0")))["0-0"]).toBe(5);
  });
  it("lcm(0, 5) = 0", async () => {
    expect((await lcm([{ "0-0": 0 }, { "0-0": 5 }], ctx("x=0")))["0-0"]).toBe(0);
  });
  it("lcm(12, 8) = 24", async () => {
    expect((await lcm([{ "0-0": 12 }, { "0-0": 8 }], ctx("x=0")))["0-0"]).toBe(24);
  });
});

describe("lcm — pipeline", () => {
  it("x = lcm(4, 6) → 12", async () => {
    const r = await runPipeline(ctx("x = lcm(4, 6)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBe(12);
  });
});
