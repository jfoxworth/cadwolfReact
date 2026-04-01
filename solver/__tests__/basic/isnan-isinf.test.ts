import { describe, it, expect } from "vitest";
import { isnan } from "../../functions/basic/isnan";
import { isinf } from "../../functions/basic/isinf";
import { ctx } from "../helpers";

describe("isnan — direct call", () => {
  it("isnan(0) → 0", async () => {
    expect((await isnan([{ "0-0": 0 }], ctx("x=0")))["0-0"]).toBe(0);
  });
  it("isnan(5) → 0", async () => {
    expect((await isnan([{ "0-0": 5 }], ctx("x=0")))["0-0"]).toBe(0);
  });
  it("isnan(NaN) → 1", async () => {
    expect((await isnan([{ "0-0": NaN }], ctx("x=0")))["0-0"]).toBe(1);
  });
  it("isnan(Infinity) → 0", async () => {
    expect((await isnan([{ "0-0": Infinity }], ctx("x=0")))["0-0"]).toBe(0);
  });
  it("row vector element-wise", async () => {
    const r = await isnan([{ "0-0": 1, "0-1": NaN, "0-2": 3 }], ctx("x=0"));
    expect(r["0-0"]).toBe(0);
    expect(r["0-1"]).toBe(1);
    expect(r["0-2"]).toBe(0);
  });
  it("empty → empty", async () => {
    expect(Object.keys(await isnan([{}], ctx("x=0")))).toHaveLength(0);
  });
});

describe("isinf — direct call", () => {
  it("isinf(0) → 0", async () => {
    expect((await isinf([{ "0-0": 0 }], ctx("x=0")))["0-0"]).toBe(0);
  });
  it("isinf(5) → 0", async () => {
    expect((await isinf([{ "0-0": 5 }], ctx("x=0")))["0-0"]).toBe(0);
  });
  it("isinf(Infinity) → 1", async () => {
    expect((await isinf([{ "0-0": Infinity }], ctx("x=0")))["0-0"]).toBe(1);
  });
  it("isinf(-Infinity) → 1", async () => {
    expect((await isinf([{ "0-0": -Infinity }], ctx("x=0")))["0-0"]).toBe(1);
  });
  it("isinf(NaN) → 0 (NaN is not infinite)", async () => {
    expect((await isinf([{ "0-0": NaN }], ctx("x=0")))["0-0"]).toBe(0);
  });
  it("row vector element-wise", async () => {
    const r = await isinf([{ "0-0": 1, "0-1": Infinity, "0-2": -Infinity }], ctx("x=0"));
    expect(r["0-0"]).toBe(0);
    expect(r["0-1"]).toBe(1);
    expect(r["0-2"]).toBe(1);
  });
});
