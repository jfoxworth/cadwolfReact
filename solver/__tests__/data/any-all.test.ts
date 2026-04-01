import { describe, it, expect } from "vitest";
import { any } from "../../functions/data/any";
import { all } from "../../functions/data/all";
import { runPipeline } from "../../pipeline";
import { ctx } from "../helpers";

describe("any — direct call", () => {
  it("any([0, 0, 0]) → 0", async () => {
    expect((await any([{ "0-0": 0, "0-1": 0, "0-2": 0 }], ctx("x=0")))["0-0"]).toBe(0);
  });
  it("any([0, 1, 0]) → 1", async () => {
    expect((await any([{ "0-0": 0, "0-1": 1, "0-2": 0 }], ctx("x=0")))["0-0"]).toBe(1);
  });
  it("any([1, 1, 1]) → 1", async () => {
    expect((await any([{ "0-0": 1, "0-1": 1, "0-2": 1 }], ctx("x=0")))["0-0"]).toBe(1);
  });
  it("any([5]) → 1", async () => {
    expect((await any([{ "0-0": 5 }], ctx("x=0")))["0-0"]).toBe(1);
  });
  it("any([0]) → 0", async () => {
    expect((await any([{ "0-0": 0 }], ctx("x=0")))["0-0"]).toBe(0);
  });
  it("negative nonzero counts: any([-3]) → 1", async () => {
    expect((await any([{ "0-0": -3 }], ctx("x=0")))["0-0"]).toBe(1);
  });
});

describe("all — direct call", () => {
  it("all([0, 0, 0]) → 0", async () => {
    expect((await all([{ "0-0": 0, "0-1": 0, "0-2": 0 }], ctx("x=0")))["0-0"]).toBe(0);
  });
  it("all([1, 0, 1]) → 0", async () => {
    expect((await all([{ "0-0": 1, "0-1": 0, "0-2": 1 }], ctx("x=0")))["0-0"]).toBe(0);
  });
  it("all([1, 1, 1]) → 1", async () => {
    expect((await all([{ "0-0": 1, "0-1": 1, "0-2": 1 }], ctx("x=0")))["0-0"]).toBe(1);
  });
  it("all([5, -3, 2]) → 1 (all nonzero)", async () => {
    expect((await all([{ "0-0": 5, "0-1": -3, "0-2": 2 }], ctx("x=0")))["0-0"]).toBe(1);
  });
  it("empty → 1 (vacuously true)", async () => {
    expect((await all([{}], ctx("x=0")))["0-0"]).toBe(1);
  });
});

describe("any/all — pipeline", () => {
  it("x = any(0) → 0", async () => {
    const r = await runPipeline(ctx("x = any(0)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBe(0);
  });
  it("x = all(1) → 1", async () => {
    const r = await runPipeline(ctx("x = all(1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBe(1);
  });
});
