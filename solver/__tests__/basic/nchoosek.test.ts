import { describe, it, expect } from "vitest";
import { nchoosek } from "../../functions/basic/nchoosek";
import { runPipeline } from "../../pipeline";
import { ctx } from "../helpers";

describe("nchoosek — direct call", () => {
  it("C(0,0) = 1", async () => {
    expect((await nchoosek([{ "0-0": 0 }, { "0-0": 0 }], ctx("x=0")))["0-0"]).toBe(1);
  });
  it("C(5,0) = 1", async () => {
    expect((await nchoosek([{ "0-0": 5 }, { "0-0": 0 }], ctx("x=0")))["0-0"]).toBe(1);
  });
  it("C(5,5) = 1", async () => {
    expect((await nchoosek([{ "0-0": 5 }, { "0-0": 5 }], ctx("x=0")))["0-0"]).toBe(1);
  });
  it("C(5,1) = 5", async () => {
    expect((await nchoosek([{ "0-0": 5 }, { "0-0": 1 }], ctx("x=0")))["0-0"]).toBe(5);
  });
  it("C(5,2) = 10", async () => {
    expect((await nchoosek([{ "0-0": 5 }, { "0-0": 2 }], ctx("x=0")))["0-0"]).toBe(10);
  });
  it("C(10,3) = 120", async () => {
    expect((await nchoosek([{ "0-0": 10 }, { "0-0": 3 }], ctx("x=0")))["0-0"]).toBe(120);
  });
  it("C(n,k) = C(n,n-k) symmetry: C(10,7) = C(10,3) = 120", async () => {
    expect((await nchoosek([{ "0-0": 10 }, { "0-0": 7 }], ctx("x=0")))["0-0"]).toBe(120);
  });
  it("k > n → 0", async () => {
    expect((await nchoosek([{ "0-0": 3 }, { "0-0": 5 }], ctx("x=0")))["0-0"]).toBe(0);
  });
});

describe("nchoosek — pipeline", () => {
  it("x = nchoosek(5, 2) → 10", async () => {
    const r = await runPipeline(ctx("x = nchoosek(5, 2)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBe(10);
  });
});
