import { describe, it, expect } from "vitest";
import { gamma } from "../../functions/utility/gamma";
import { lgamma } from "../../functions/utility/lgamma";
import { runPipeline } from "../../pipeline";
import { ctx } from "../helpers";

describe("gamma — direct call", () => {
  it("Γ(1) = 1", async () => {
    expect((await gamma([{ "0-0": 1 }], ctx("x=0")))["0-0"]).toBeCloseTo(1, 8);
  });
  it("Γ(2) = 1", async () => {
    expect((await gamma([{ "0-0": 2 }], ctx("x=0")))["0-0"]).toBeCloseTo(1, 8);
  });
  it("Γ(3) = 2", async () => {
    expect((await gamma([{ "0-0": 3 }], ctx("x=0")))["0-0"]).toBeCloseTo(2, 8);
  });
  it("Γ(4) = 6 = 3!", async () => {
    expect((await gamma([{ "0-0": 4 }], ctx("x=0")))["0-0"]).toBeCloseTo(6, 7);
  });
  it("Γ(5) = 24 = 4!", async () => {
    expect((await gamma([{ "0-0": 5 }], ctx("x=0")))["0-0"]).toBeCloseTo(24, 6);
  });
  it("Γ(0.5) = √π", async () => {
    expect((await gamma([{ "0-0": 0.5 }], ctx("x=0")))["0-0"]).toBeCloseTo(Math.sqrt(Math.PI), 7);
  });
  it("Γ(1.5) = 0.5√π", async () => {
    expect((await gamma([{ "0-0": 1.5 }], ctx("x=0")))["0-0"]).toBeCloseTo(0.5 * Math.sqrt(Math.PI), 7);
  });
});

describe("lgamma — direct call", () => {
  it("lgamma(1) = 0", async () => {
    expect((await lgamma([{ "0-0": 1 }], ctx("x=0")))["0-0"]).toBeCloseTo(0, 8);
  });
  it("lgamma(2) = 0", async () => {
    expect((await lgamma([{ "0-0": 2 }], ctx("x=0")))["0-0"]).toBeCloseTo(0, 8);
  });
  it("lgamma(5) = log(4!) = log(24)", async () => {
    expect((await lgamma([{ "0-0": 5 }], ctx("x=0")))["0-0"]).toBeCloseTo(Math.log(24), 7);
  });
  it("lgamma = log(gamma) identity", async () => {
    const g = (await gamma([{ "0-0": 3.5 }], ctx("x=0")))["0-0"];
    const lg = (await lgamma([{ "0-0": 3.5 }], ctx("x=0")))["0-0"];
    expect(lg).toBeCloseTo(Math.log(g), 7);
  });
});

describe("gamma — pipeline", () => {
  it("x = gamma(5) → 24", async () => {
    const r = await runPipeline(ctx("x = gamma(5)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(24, 5);
  });
});
