import { describe, it, expect } from "vitest";
import { arange }   from "../../functions/data/arange";
import { logspace } from "../../functions/data/logspace";
import { full }     from "../../functions/matrix/full";

const ctx = {} as any;

// ─── arange ───────────────────────────────────────────────────────────────────

describe("arange", () => {
  it("arange(5) → [0, 1, 2, 3, 4]", async () => {
    const r = await arange([{ "0-0": 5 }], ctx);
    expect(r["0-0"]).toBe(0);
    expect(r["0-1"]).toBe(1);
    expect(r["0-2"]).toBe(2);
    expect(r["0-3"]).toBe(3);
    expect(r["0-4"]).toBe(4);
    expect(r["0-5"]).toBeUndefined();
  });

  it("arange(1, 4) → [1, 2, 3]", async () => {
    const r = await arange([{ "0-0": 1 }, { "0-0": 4 }], ctx);
    expect(r["0-0"]).toBe(1);
    expect(r["0-1"]).toBe(2);
    expect(r["0-2"]).toBe(3);
    expect(r["0-3"]).toBeUndefined();
  });

  it("arange(0, 1, 0.5) → [0, 0.5]", async () => {
    const r = await arange([{ "0-0": 0 }, { "0-0": 1 }, { "0-0": 0.5 }], ctx);
    expect(r["0-0"]).toBeCloseTo(0);
    expect(r["0-1"]).toBeCloseTo(0.5);
    expect(r["0-2"]).toBeUndefined();
  });

  it("arange with negative step counts down", async () => {
    const r = await arange([{ "0-0": 3 }, { "0-0": 0 }, { "0-0": -1 }], ctx);
    expect(r["0-0"]).toBe(3);
    expect(r["0-1"]).toBe(2);
    expect(r["0-2"]).toBe(1);
    expect(r["0-3"]).toBeUndefined();
  });

  it("arange with step=0 returns NaN", async () => {
    const r = await arange([{ "0-0": 0 }, { "0-0": 5 }, { "0-0": 0 }], ctx);
    expect(r["0-0"]).toBeNaN();
  });

  it("arange(2, 2) (empty range) returns single start value", async () => {
    const r = await arange([{ "0-0": 2 }, { "0-0": 2 }], ctx);
    expect(r["0-0"]).toBe(2);
    expect(r["0-1"]).toBeUndefined();
  });
});

// ─── logspace ─────────────────────────────────────────────────────────────────

describe("logspace", () => {
  it("logspace(0, 2, 3) → [1, 10, 100]", async () => {
    const r = await logspace([{ "0-0": 0 }, { "0-0": 2 }, { "0-0": 3 }], ctx);
    expect(r["0-0"]).toBeCloseTo(1);
    expect(r["0-1"]).toBeCloseTo(10);
    expect(r["0-2"]).toBeCloseTo(100);
  });

  it("logspace(1, 3, 3) → [10, 100, 1000]", async () => {
    const r = await logspace([{ "0-0": 1 }, { "0-0": 3 }, { "0-0": 3 }], ctx);
    expect(r["0-0"]).toBeCloseTo(10);
    expect(r["0-1"]).toBeCloseTo(100);
    expect(r["0-2"]).toBeCloseTo(1000);
  });

  it("logspace endpoints are exact powers of 10", async () => {
    const r = await logspace([{ "0-0": -2 }, { "0-0": 4 }, { "0-0": 7 }], ctx);
    expect(r["0-0"]).toBeCloseTo(0.01);
    expect(r["0-6"]).toBeCloseTo(10000);
  });

  it("default n=50 produces 50 values", async () => {
    const r = await logspace([{ "0-0": 0 }, { "0-0": 1 }], ctx);
    expect(Object.keys(r).length).toBe(50);
  });

  it("all values are positive", async () => {
    const r = await logspace([{ "0-0": -3 }, { "0-0": 3 }, { "0-0": 10 }], ctx);
    for (const v of Object.values(r)) expect(v).toBeGreaterThan(0);
  });
});

// ─── full ─────────────────────────────────────────────────────────────────────

describe("full", () => {
  it("full(2, 3, 7) → 2×3 matrix of 7s", async () => {
    const r = await full([{ "0-0": 2 }, { "0-0": 3 }, { "0-0": 7 }], ctx);
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        expect(r[`${row}-${col}`]).toBe(7);
      }
    }
    expect(Object.keys(r).length).toBe(6);
  });

  it("full(3, 5) → 3×3 matrix of 5s (square shorthand)", async () => {
    const r = await full([{ "0-0": 3 }, { "0-0": 5 }], ctx);
    expect(Object.keys(r).length).toBe(9);
    for (const v of Object.values(r)) expect(v).toBe(5);
  });

  it("full(1, 1, 42) → scalar 42", async () => {
    const r = await full([{ "0-0": 1 }, { "0-0": 1 }, { "0-0": 42 }], ctx);
    expect(r["0-0"]).toBe(42);
    expect(Object.keys(r).length).toBe(1);
  });

  it("full with val=0 produces zero matrix like zeros()", async () => {
    const r = await full([{ "0-0": 2 }, { "0-0": 2 }, { "0-0": 0 }], ctx);
    for (const v of Object.values(r)) expect(v).toBe(0);
  });

  it("full with negative value", async () => {
    const r = await full([{ "0-0": 2 }, { "0-0": 2 }, { "0-0": -3.5 }], ctx);
    for (const v of Object.values(r)) expect(v).toBe(-3.5);
  });
});
