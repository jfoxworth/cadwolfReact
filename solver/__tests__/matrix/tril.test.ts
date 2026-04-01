import { describe, it, expect } from "vitest";
import { tril } from "../../functions/matrix/tril";
import { ctx } from "../helpers";

const A3 = {
  "0-0": 1, "0-1": 2, "0-2": 3,
  "1-0": 4, "1-1": 5, "1-2": 6,
  "2-0": 7, "2-1": 8, "2-2": 9,
};

describe("tril — direct call", () => {
  it("lower triangular of 3×3 (k=0)", async () => {
    const r = await tril([A3], ctx("x=0"));
    expect(r["0-0"]).toBe(1); expect(r["0-1"]).toBe(0); expect(r["0-2"]).toBe(0);
    expect(r["1-0"]).toBe(4); expect(r["1-1"]).toBe(5); expect(r["1-2"]).toBe(0);
    expect(r["2-0"]).toBe(7); expect(r["2-1"]).toBe(8); expect(r["2-2"]).toBe(9);
  });
  it("strict lower triangular (k=-1)", async () => {
    const r = await tril([A3, { "0-0": -1 }], ctx("x=0"));
    expect(r["0-0"]).toBe(0);
    expect(r["1-0"]).toBe(4); expect(r["1-1"]).toBe(0);
    expect(r["2-0"]).toBe(7); expect(r["2-1"]).toBe(8); expect(r["2-2"]).toBe(0);
  });
  it("k=1 includes super-diagonal", async () => {
    const r = await tril([A3, { "0-0": 1 }], ctx("x=0"));
    expect(r["0-1"]).toBe(2); // one above diagonal included
    expect(r["0-2"]).toBe(0); // two above diagonal zeroed
  });
});
