import { describe, it, expect } from "vitest";
import { cbrt }  from "../../functions/basic/cbrt";
import { log1p } from "../../functions/basic/log1p";
import { expm1 } from "../../functions/basic/expm1";

describe("cbrt", () => {
  it("cube root of 8 = 2", async () => {
    const r = await cbrt([{ "0-0": 8 }], {} as any);
    expect(r["0-0"]).toBeCloseTo(2, 10);
  });

  it("cube root of -27 = -3", async () => {
    const r = await cbrt([{ "0-0": -27 }], {} as any);
    expect(r["0-0"]).toBeCloseTo(-3, 10);
  });

  it("cube root of 0 = 0", async () => {
    const r = await cbrt([{ "0-0": 0 }], {} as any);
    expect(r["0-0"]).toBe(0);
  });

  it("element-wise on vector", async () => {
    const r = await cbrt([{ "0-0": 1, "0-1": 8, "0-2": 27 }], {} as any);
    expect(r["0-0"]).toBeCloseTo(1, 10);
    expect(r["0-1"]).toBeCloseTo(2, 10);
    expect(r["0-2"]).toBeCloseTo(3, 10);
  });
});

describe("log1p", () => {
  it("log1p(0) = 0", async () => {
    const r = await log1p([{ "0-0": 0 }], {} as any);
    expect(r["0-0"]).toBe(0);
  });

  it("log1p(e-1) = 1", async () => {
    const r = await log1p([{ "0-0": Math.E - 1 }], {} as any);
    expect(r["0-0"]).toBeCloseTo(1, 10);
  });

  it("log1p numerically stable near 0: log1p(1e-15)", async () => {
    const r = await log1p([{ "0-0": 1e-15 }], {} as any);
    expect(r["0-0"]).toBeCloseTo(1e-15, 25);
  });
});

describe("expm1", () => {
  it("expm1(0) = 0", async () => {
    const r = await expm1([{ "0-0": 0 }], {} as any);
    expect(r["0-0"]).toBe(0);
  });

  it("expm1(1) = e-1", async () => {
    const r = await expm1([{ "0-0": 1 }], {} as any);
    expect(r["0-0"]).toBeCloseTo(Math.E - 1, 10);
  });

  it("expm1 numerically stable near 0: expm1(1e-15)", async () => {
    const r = await expm1([{ "0-0": 1e-15 }], {} as any);
    expect(r["0-0"]).toBeCloseTo(1e-15, 25);
  });
});
