import { describe, it, expect } from "vitest";
import { zeros } from "../../functions/matrix/zeros";
import { runPipeline } from "../../pipeline";
import { ctx } from "../helpers";

describe("zeros — direct call", () => {
  it("zeros(1) → 1×1 matrix of 0", async () => {
    const r = await zeros([{ "0-0": 1 }], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(1);
    expect(r["0-0"]).toBe(0);
  });
  it("zeros(2, 3) → 2×3 matrix of zeros", async () => {
    const r = await zeros([{ "0-0": 2 }, { "0-0": 3 }], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(6);
    for (const v of Object.values(r)) expect(v).toBe(0);
  });
  it("zeros(3) → 3×3 matrix of zeros", async () => {
    const r = await zeros([{ "0-0": 3 }], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(9);
    for (const v of Object.values(r)) expect(v).toBe(0);
  });
  it("key layout correct: zeros(2,2) has keys 0-0,0-1,1-0,1-1", async () => {
    const r = await zeros([{ "0-0": 2 }, { "0-0": 2 }], ctx("x=0"));
    expect("0-0" in r).toBe(true);
    expect("0-1" in r).toBe(true);
    expect("1-0" in r).toBe(true);
    expect("1-1" in r).toBe(true);
  });
});

describe("zeros — pipeline", () => {
  it("x = zeros(2, 3) → 6 elements all 0", async () => {
    const r = await runPipeline(ctx("x = zeros(2, 3)"));
    expect(r.errors).toHaveLength(0);
    expect(Object.keys(r.solution.real)).toHaveLength(6);
    for (const v of Object.values(r.solution.real)) expect(v).toBe(0);
  });
});
