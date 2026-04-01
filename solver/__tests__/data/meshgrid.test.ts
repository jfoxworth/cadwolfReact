import { describe, it, expect } from "vitest";
import { meshgrid } from "../../functions/data/meshgrid";

// x = [1,2,3], y = [4,5]  →  X is 2×3, Y is 2×3
const x = { "0-0": 1, "0-1": 2, "0-2": 3 };
const y = { "0-0": 4, "0-1": 5 };

describe("meshgrid", () => {
  it("which=1 (default) — X matrix: X[i][j] = x[j]", async () => {
    const r = await meshgrid([x, y], {} as any);
    // Row 0
    expect(r["0-0"]).toBe(1);
    expect(r["0-1"]).toBe(2);
    expect(r["0-2"]).toBe(3);
    // Row 1
    expect(r["1-0"]).toBe(1);
    expect(r["1-1"]).toBe(2);
    expect(r["1-2"]).toBe(3);
  });

  it("which=2 — Y matrix: Y[i][j] = y[i]", async () => {
    const r = await meshgrid([x, y, { "0-0": 2 }], {} as any);
    // Row 0: all = y[0] = 4
    expect(r["0-0"]).toBe(4);
    expect(r["0-1"]).toBe(4);
    expect(r["0-2"]).toBe(4);
    // Row 1: all = y[1] = 5
    expect(r["1-0"]).toBe(5);
    expect(r["1-1"]).toBe(5);
    expect(r["1-2"]).toBe(5);
  });

  it("output has m×n elements", async () => {
    const r = await meshgrid([x, y], {} as any);
    expect(Object.keys(r).length).toBe(6); // 2 rows × 3 cols
  });

  it("empty x or y returns empty", async () => {
    const r = await meshgrid([{}, y], {} as any);
    expect(Object.keys(r).length).toBe(0);
  });
});
