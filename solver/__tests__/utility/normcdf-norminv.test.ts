import { describe, it, expect } from "vitest";
import { normcdf } from "../../functions/utility/normcdf";
import { norminv } from "../../functions/utility/norminv";
import { ctx } from "../helpers";

describe("normcdf — direct call", () => {
  it("normcdf(0) = 0.5 (standard normal)", async () => {
    expect((await normcdf([{ "0-0": 0 }], ctx("x=0")))["0-0"]).toBeCloseTo(0.5, 5);
  });
  it("normcdf(1) ≈ 0.8413", async () => {
    expect((await normcdf([{ "0-0": 1 }], ctx("x=0")))["0-0"]).toBeCloseTo(0.84134, 4);
  });
  it("normcdf(-1) ≈ 0.1587", async () => {
    expect((await normcdf([{ "0-0": -1 }], ctx("x=0")))["0-0"]).toBeCloseTo(0.15866, 4);
  });
  it("normcdf(1.96) ≈ 0.975", async () => {
    expect((await normcdf([{ "0-0": 1.96 }], ctx("x=0")))["0-0"]).toBeCloseTo(0.975, 3);
  });
  it("normcdf(-∞) → 0", async () => {
    expect((await normcdf([{ "0-0": -100 }], ctx("x=0")))["0-0"]).toBeCloseTo(0, 5);
  });
  it("normcdf(∞) → 1", async () => {
    expect((await normcdf([{ "0-0": 100 }], ctx("x=0")))["0-0"]).toBeCloseTo(1, 5);
  });
  it("symmetry: normcdf(x) + normcdf(-x) = 1", async () => {
    const a = (await normcdf([{ "0-0": 1.5 }], ctx("x=0")))["0-0"];
    const b = (await normcdf([{ "0-0": -1.5 }], ctx("x=0")))["0-0"];
    expect(a + b).toBeCloseTo(1, 5);
  });
});

describe("norminv — direct call", () => {
  it("norminv(0.5) = 0 (median of standard normal)", async () => {
    expect((await norminv([{ "0-0": 0.5 }], ctx("x=0")))["0-0"]).toBeCloseTo(0, 5);
  });
  it("norminv(0.8413) ≈ 1", async () => {
    expect((await norminv([{ "0-0": 0.8413 }], ctx("x=0")))["0-0"]).toBeCloseTo(1, 3);
  });
  it("norminv(0.025) ≈ -1.96", async () => {
    expect((await norminv([{ "0-0": 0.025 }], ctx("x=0")))["0-0"]).toBeCloseTo(-1.96, 2);
  });
  it("norminv(0.975) ≈ 1.96", async () => {
    expect((await norminv([{ "0-0": 0.975 }], ctx("x=0")))["0-0"]).toBeCloseTo(1.96, 2);
  });
  it("norminv(0) = -Infinity", async () => {
    expect((await norminv([{ "0-0": 0 }], ctx("x=0")))["0-0"]).toBe(-Infinity);
  });
  it("norminv(1) = Infinity", async () => {
    expect((await norminv([{ "0-0": 1 }], ctx("x=0")))["0-0"]).toBe(Infinity);
  });
});

describe("normcdf/norminv roundtrip", () => {
  it("norminv(normcdf(x)) ≈ x for x=1.5", async () => {
    const p = (await normcdf([{ "0-0": 1.5 }], ctx("x=0")))["0-0"];
    const x = (await norminv([{ "0-0": p }], ctx("x=0")))["0-0"];
    expect(x).toBeCloseTo(1.5, 4);
  });
});
