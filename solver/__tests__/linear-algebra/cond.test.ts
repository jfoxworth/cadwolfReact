import { describe, it, expect } from "vitest";
import { cond } from "../../functions/linear-algebra/cond";

describe("cond", () => {
  it("identity matrix has condition number 1", async () => {
    const I = { "0-0": 1, "0-1": 0, "1-0": 0, "1-1": 1 };
    const r = await cond([I], {} as any);
    expect(r["0-0"]).toBeCloseTo(1, 6);
  });

  it("scalar [a] has condition number 1", async () => {
    const r = await cond([{ "0-0": 5 }], {} as any);
    expect(r["0-0"]).toBeCloseTo(1, 6);
  });

  it("diagonal matrix cond = max/min diagonal", async () => {
    const D = { "0-0": 1, "0-1": 0, "1-0": 0, "1-1": 100 };
    const r = await cond([D], {} as any);
    expect(r["0-0"]).toBeCloseTo(100, 4);
  });

  it("singular matrix returns Infinity", async () => {
    const A = { "0-0": 1, "0-1": 2, "1-0": 2, "1-1": 4 };
    const r = await cond([A], {} as any);
    expect(r["0-0"]).toBe(Infinity);
  });
});
