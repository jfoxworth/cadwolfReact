import { describe, it, expect } from "vitest";
import { ones } from "../../functions/matrix/ones";
import { runPipeline } from "../../pipeline";
import { ctx } from "../helpers";

describe("ones — direct call", () => {
  it("ones(1) → 1×1 matrix of 1", async () => {
    const r = await ones([{ "0-0": 1 }], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(1);
    expect(r["0-0"]).toBe(1);
  });
  it("ones(2, 3) → 2×3 matrix of ones", async () => {
    const r = await ones([{ "0-0": 2 }, { "0-0": 3 }], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(6);
    for (const v of Object.values(r)) expect(v).toBe(1);
  });
  it("ones(3) → 3×3 matrix of ones", async () => {
    const r = await ones([{ "0-0": 3 }], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(9);
    for (const v of Object.values(r)) expect(v).toBe(1);
  });
});

describe("ones — pipeline", () => {
  it("x = ones(2, 4) → 8 elements all 1", async () => {
    const r = await runPipeline(ctx("x = ones(2, 4)"));
    expect(r.errors).toHaveLength(0);
    expect(Object.keys(r.solution.real)).toHaveLength(8);
    for (const v of Object.values(r.solution.real)) expect(v).toBe(1);
  });
});
