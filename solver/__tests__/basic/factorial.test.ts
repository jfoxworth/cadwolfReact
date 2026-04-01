import { describe, it, expect } from "vitest";
import { factorial } from "../../functions/basic/factorial";
import { runPipeline } from "../../pipeline";
import { ctx } from "../helpers";

describe("factorial — direct call", () => {
  it("0! = 1", async () => {
    expect((await factorial([{ "0-0": 0 }], ctx("x=0")))["0-0"]).toBe(1);
  });
  it("1! = 1", async () => {
    expect((await factorial([{ "0-0": 1 }], ctx("x=0")))["0-0"]).toBe(1);
  });
  it("5! = 120", async () => {
    expect((await factorial([{ "0-0": 5 }], ctx("x=0")))["0-0"]).toBe(120);
  });
  it("10! = 3628800", async () => {
    expect((await factorial([{ "0-0": 10 }], ctx("x=0")))["0-0"]).toBe(3628800);
  });
  it("row vector [0,1,2,3,4,5] → [1,1,2,6,24,120]", async () => {
    const r = await factorial([{ "0-0": 0, "0-1": 1, "0-2": 2, "0-3": 3, "0-4": 4, "0-5": 5 }], ctx("x=0"));
    expect(r["0-0"]).toBe(1);
    expect(r["0-1"]).toBe(1);
    expect(r["0-2"]).toBe(2);
    expect(r["0-3"]).toBe(6);
    expect(r["0-4"]).toBe(24);
    expect(r["0-5"]).toBe(120);
  });
});

describe("factorial — pipeline", () => {
  it("x = factorial(5) → 120", async () => {
    const r = await runPipeline(ctx("x = factorial(5)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBe(120);
  });
  it("x = factorial(0) → 1", async () => {
    const r = await runPipeline(ctx("x = factorial(0)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBe(1);
  });
});
