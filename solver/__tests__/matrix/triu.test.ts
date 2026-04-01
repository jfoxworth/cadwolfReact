import { describe, it, expect } from "vitest";
import { triu } from "../../functions/matrix/triu";
import { ctx } from "../helpers";

const A3 = {
  "0-0": 1, "0-1": 2, "0-2": 3,
  "1-0": 4, "1-1": 5, "1-2": 6,
  "2-0": 7, "2-1": 8, "2-2": 9,
};

describe("triu — direct call", () => {
  it("upper triangular of 3×3 (k=0)", async () => {
    const r = await triu([A3], ctx("x=0"));
    expect(r["0-0"]).toBe(1); expect(r["0-1"]).toBe(2); expect(r["0-2"]).toBe(3);
    expect(r["1-0"]).toBe(0); expect(r["1-1"]).toBe(5); expect(r["1-2"]).toBe(6);
    expect(r["2-0"]).toBe(0); expect(r["2-1"]).toBe(0); expect(r["2-2"]).toBe(9);
  });
  it("strict upper triangular (k=1)", async () => {
    const r = await triu([A3, { "0-0": 1 }], ctx("x=0"));
    expect(r["0-0"]).toBe(0); expect(r["0-1"]).toBe(2); expect(r["0-2"]).toBe(3);
    expect(r["1-1"]).toBe(0); expect(r["1-2"]).toBe(6);
    expect(r["2-2"]).toBe(0);
  });
  it("k=-1 includes sub-diagonal", async () => {
    // c - r >= -1: keeps (1,0) and (2,1) since their col-row=-1; zeros only (2,0) where col-row=-2
    const r = await triu([A3, { "0-0": -1 }], ctx("x=0"));
    expect(r["1-0"]).toBe(4); // col-row = -1, included
    expect(r["2-0"]).toBe(0); // col-row = -2, zeroed
    expect(r["2-1"]).toBe(8); // col-row = -1, included
  });
});
