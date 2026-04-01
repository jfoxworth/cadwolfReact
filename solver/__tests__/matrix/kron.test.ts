import { describe, it, expect } from "vitest";
import { kron } from "../../functions/matrix/kron";
import { ctx } from "../helpers";

describe("kron — direct call", () => {
  it("kron([[1,2],[3,4]], [[0,5],[6,7]]) — known result", async () => {
    const A = { "0-0": 1, "0-1": 2, "1-0": 3, "1-1": 4 };
    const B = { "0-0": 0, "0-1": 5, "1-0": 6, "1-1": 7 };
    const r = await kron([A, B], ctx("x=0"));
    // Result is 4×4: kron([1,2;3,4], [0,5;6,7])
    expect(r["0-0"]).toBe(0);  expect(r["0-1"]).toBe(5);  expect(r["0-2"]).toBe(0);  expect(r["0-3"]).toBe(10);
    expect(r["1-0"]).toBe(6);  expect(r["1-1"]).toBe(7);  expect(r["1-2"]).toBe(12); expect(r["1-3"]).toBe(14);
    expect(r["2-0"]).toBe(0);  expect(r["2-1"]).toBe(15); expect(r["2-2"]).toBe(0);  expect(r["2-3"]).toBe(20);
    expect(r["3-0"]).toBe(18); expect(r["3-1"]).toBe(21); expect(r["3-2"]).toBe(24); expect(r["3-3"]).toBe(28);
  });

  it("kron([[1]], B) = B (identity scalar)", async () => {
    const B = { "0-0": 3, "0-1": 4, "1-0": 5, "1-1": 6 };
    const r = await kron([{ "0-0": 1 }, B], ctx("x=0"));
    expect(r["0-0"]).toBe(3); expect(r["0-1"]).toBe(4);
    expect(r["1-0"]).toBe(5); expect(r["1-1"]).toBe(6);
  });

  it("kron([[2]], B) = 2*B", async () => {
    const B = { "0-0": 3, "0-1": 4, "1-0": 5, "1-1": 6 };
    const r = await kron([{ "0-0": 2 }, B], ctx("x=0"));
    expect(r["0-0"]).toBe(6); expect(r["0-1"]).toBe(8);
    expect(r["1-0"]).toBe(10); expect(r["1-1"]).toBe(12);
  });

  it("result dimensions: kron(m×n, p×q) → mp×nq", async () => {
    const A = { "0-0": 1, "0-1": 2, "0-2": 3 }; // 1×3
    const B = { "0-0": 1, "1-0": 1 };             // 2×1
    const r = await kron([A, B], ctx("x=0"));
    // Result should be 2×3
    expect(Object.keys(r)).toHaveLength(6);
  });
});
