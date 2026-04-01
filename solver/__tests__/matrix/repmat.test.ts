import { describe, it, expect } from "vitest";
import { repmat } from "../../functions/matrix/repmat";
import { ctx } from "../helpers";

describe("repmat — direct call", () => {
  it("repmat([[1,2],[3,4]], 1, 1) → same matrix", async () => {
    const A = { "0-0": 1, "0-1": 2, "1-0": 3, "1-1": 4 };
    const r = await repmat([A, { "0-0": 1 }, { "0-0": 1 }], ctx("x=0"));
    expect(r["0-0"]).toBe(1); expect(r["0-1"]).toBe(2);
    expect(r["1-0"]).toBe(3); expect(r["1-1"]).toBe(4);
  });

  it("repmat([[1,2]], 2, 1) → 2×2 vertical tile", async () => {
    const A = { "0-0": 1, "0-1": 2 };
    const r = await repmat([A, { "0-0": 2 }, { "0-0": 1 }], ctx("x=0"));
    expect(r["0-0"]).toBe(1); expect(r["0-1"]).toBe(2);
    expect(r["1-0"]).toBe(1); expect(r["1-1"]).toBe(2);
  });

  it("repmat([[1,2]], 1, 2) → 1×4 horizontal tile", async () => {
    const A = { "0-0": 1, "0-1": 2 };
    const r = await repmat([A, { "0-0": 1 }, { "0-0": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBe(1); expect(r["0-1"]).toBe(2);
    expect(r["0-2"]).toBe(1); expect(r["0-3"]).toBe(2);
  });

  it("repmat([[5]], 3, 3) → 3×3 matrix of 5", async () => {
    const r = await repmat([{ "0-0": 5 }, { "0-0": 3 }, { "0-0": 3 }], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(9);
    for (const v of Object.values(r)) expect(v).toBe(5);
  });

  it("result size: repmat(m×n, p, q) → pm×qn elements", async () => {
    const A = { "0-0": 1, "0-1": 2, "1-0": 3, "1-1": 4 }; // 2×2
    const r = await repmat([A, { "0-0": 3 }, { "0-0": 2 }], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(24); // 6×4
  });
});
