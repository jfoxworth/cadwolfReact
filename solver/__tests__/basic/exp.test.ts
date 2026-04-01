import { describe, it, expect } from "vitest";
import { exp } from "../../functions/basic/exp";
import { runPipeline } from "../../pipeline";
import { ctx } from "../helpers";

describe("exp — direct call", () => {
  it("exp(0) = 1", async () => {
    expect((await exp([{ "0-0": 0 }], ctx("x=0")))["0-0"]).toBeCloseTo(1, 10);
  });
  it("exp(1) = e", async () => {
    expect((await exp([{ "0-0": 1 }], ctx("x=0")))["0-0"]).toBeCloseTo(Math.E, 10);
  });
  it("exp(-1) = 1/e", async () => {
    expect((await exp([{ "0-0": -1 }], ctx("x=0")))["0-0"]).toBeCloseTo(1 / Math.E, 10);
  });
  it("exp(2) = e²", async () => {
    expect((await exp([{ "0-0": 2 }], ctx("x=0")))["0-0"]).toBeCloseTo(Math.E ** 2, 8);
  });
  it("row vector element-wise", async () => {
    const r = await exp([{ "0-0": 0, "0-1": 1, "0-2": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 8);
    expect(r["0-1"]).toBeCloseTo(Math.E, 8);
    expect(r["0-2"]).toBeCloseTo(Math.E ** 2, 8);
  });
  it("empty → empty", async () => {
    expect(Object.keys(await exp([{}], ctx("x=0")))).toHaveLength(0);
  });
});

describe("exp — pipeline", () => {
  it("x = exp(0) → 1", async () => {
    const r = await runPipeline(ctx("x = exp(0)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
  });
  it("x = exp(1) → e", async () => {
    const r = await runPipeline(ctx("x = exp(1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.E, 4);
  });
});
