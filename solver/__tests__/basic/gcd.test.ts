import { describe, it, expect } from "vitest";
import { gcd } from "../../functions/basic/gcd";
import { runPipeline } from "../../pipeline";
import { ctx } from "../helpers";

describe("gcd — direct call", () => {
  it("gcd(12, 8) = 4", async () => {
    expect((await gcd([{ "0-0": 12 }, { "0-0": 8 }], ctx("x=0")))["0-0"]).toBe(4);
  });
  it("gcd(7, 3) = 1 (coprime)", async () => {
    expect((await gcd([{ "0-0": 7 }, { "0-0": 3 }], ctx("x=0")))["0-0"]).toBe(1);
  });
  it("gcd(0, 5) = 5", async () => {
    expect((await gcd([{ "0-0": 0 }, { "0-0": 5 }], ctx("x=0")))["0-0"]).toBe(5);
  });
  it("gcd(6, 0) = 6", async () => {
    expect((await gcd([{ "0-0": 6 }, { "0-0": 0 }], ctx("x=0")))["0-0"]).toBe(6);
  });
  it("gcd(0, 0) = 0", async () => {
    expect((await gcd([{ "0-0": 0 }, { "0-0": 0 }], ctx("x=0")))["0-0"]).toBe(0);
  });
  it("gcd(-12, 8) = 4 (uses abs)", async () => {
    expect((await gcd([{ "0-0": -12 }, { "0-0": 8 }], ctx("x=0")))["0-0"]).toBe(4);
  });
  it("gcd(100, 75) = 25", async () => {
    expect((await gcd([{ "0-0": 100 }, { "0-0": 75 }], ctx("x=0")))["0-0"]).toBe(25);
  });
});

describe("gcd — pipeline", () => {
  it("x = gcd(12, 8) → 4", async () => {
    const r = await runPipeline(ctx("x = gcd(12, 8)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBe(4);
  });
});
