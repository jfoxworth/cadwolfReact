import { describe, it, expect } from "vitest";
import { flatten } from "../../functions/data/flatten";

describe("flatten", () => {
  it("2×3 matrix → 6-element row vector in row-major order", async () => {
    const A = {
      "0-0": 1, "0-1": 2, "0-2": 3,
      "1-0": 4, "1-1": 5, "1-2": 6,
    };
    const r = await flatten([A], {} as any);
    expect(r["0-0"]).toBe(1);
    expect(r["0-1"]).toBe(2);
    expect(r["0-2"]).toBe(3);
    expect(r["0-3"]).toBe(4);
    expect(r["0-4"]).toBe(5);
    expect(r["0-5"]).toBe(6);
    expect(Object.keys(r).length).toBe(6);
  });

  it("row vector is unchanged", async () => {
    const r = await flatten([{ "0-0": 7, "0-1": 8, "0-2": 9 }], {} as any);
    expect(r["0-0"]).toBe(7);
    expect(r["0-1"]).toBe(8);
    expect(r["0-2"]).toBe(9);
  });

  it("column vector becomes row vector", async () => {
    const r = await flatten([{ "0-0": 1, "1-0": 2, "2-0": 3 }], {} as any);
    expect(r["0-0"]).toBe(1);
    expect(r["0-1"]).toBe(2);
    expect(r["0-2"]).toBe(3);
    // No column keys
    expect(r["1-0"]).toBeUndefined();
  });

  it("single element", async () => {
    const r = await flatten([{ "0-0": 42 }], {} as any);
    expect(r["0-0"]).toBe(42);
  });

  it("empty returns empty", async () => {
    const r = await flatten([{}], {} as any);
    expect(Object.keys(r).length).toBe(0);
  });
});
