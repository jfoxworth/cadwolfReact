/**
 * Tests for linspace() — solver/functions/data/linspace.ts
 * linspace(start, stop, n) → row vector of n evenly spaced values from start to stop (inclusive)
 */

import { describe, it, expect } from "vitest";
import { linspace } from "../../functions/data/linspace";
import { runPipeline } from "../../pipeline";
import { ctx } from "../helpers";

// ── Direct call tests ──────────────────────────────────────────────────────────

describe("linspace — direct call: basic", () => {
  it("linspace(0, 1, 3) → [0, 0.5, 1]", async () => {
    const r = await linspace([{ "0-0": 0 }, { "0-0": 1 }, { "0-0": 3 }], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(3);
    expect(r["0-0"]).toBeCloseTo(0, 10);
    expect(r["0-1"]).toBeCloseTo(0.5, 10);
    expect(r["0-2"]).toBeCloseTo(1, 10);
  });

  it("linspace(0, 10, 5) → [0, 2.5, 5, 7.5, 10]", async () => {
    const r = await linspace([{ "0-0": 0 }, { "0-0": 10 }, { "0-0": 5 }], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(5);
    expect(r["0-0"]).toBeCloseTo(0, 8);
    expect(r["0-1"]).toBeCloseTo(2.5, 8);
    expect(r["0-2"]).toBeCloseTo(5, 8);
    expect(r["0-3"]).toBeCloseTo(7.5, 8);
    expect(r["0-4"]).toBeCloseTo(10, 8);
  });

  it("first element always equals start", async () => {
    const r = await linspace([{ "0-0": 3 }, { "0-0": 7 }, { "0-0": 10 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(3, 10);
  });

  it("last element always equals stop", async () => {
    const r = await linspace([{ "0-0": 3 }, { "0-0": 7 }, { "0-0": 10 }], ctx("x=0"));
    expect(r["0-9"]).toBeCloseTo(7, 10);
  });

  it("negative range linspace(-5, -1, 5) → [-5, -4, -3, -2, -1]", async () => {
    const r = await linspace([{ "0-0": -5 }, { "0-0": -1 }, { "0-0": 5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-5, 8);
    expect(r["0-1"]).toBeCloseTo(-4, 8);
    expect(r["0-2"]).toBeCloseTo(-3, 8);
    expect(r["0-3"]).toBeCloseTo(-2, 8);
    expect(r["0-4"]).toBeCloseTo(-1, 8);
  });

  it("n=2 → [start, stop]", async () => {
    const r = await linspace([{ "0-0": 3 }, { "0-0": 9 }, { "0-0": 2 }], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(2);
    expect(r["0-0"]).toBeCloseTo(3, 10);
    expect(r["0-1"]).toBeCloseTo(9, 10);
  });

  it("returns a row vector (all keys start with '0-')", async () => {
    const r = await linspace([{ "0-0": 0 }, { "0-0": 1 }, { "0-0": 5 }], ctx("x=0"));
    for (const k of Object.keys(r)) {
      expect(k.startsWith("0-")).toBe(true);
    }
  });
});

describe("linspace — direct call: edge cases", () => {
  it("n < 2 → treated as 2 (returns [start, stop])", async () => {
    const r = await linspace([{ "0-0": 1 }, { "0-0": 5 }, { "0-0": 1 }], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(2);
    expect(r["0-0"]).toBeCloseTo(1, 10);
    expect(r["0-1"]).toBeCloseTo(5, 10);
  });

  it("start === stop → all values equal start", async () => {
    const r = await linspace([{ "0-0": 4 }, { "0-0": 4 }, { "0-0": 4 }], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(4);
    for (const v of Object.values(r)) {
      expect(v).toBeCloseTo(4, 10);
    }
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("linspace — pipeline", () => {
  it("x = linspace(0, 1, 3) → row vector with 3 elements", async () => {
    const r = await runPipeline(ctx("x = linspace(0, 1, 3)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(0.5, 4);
    expect(r.solution.real["0-2"]).toBeCloseTo(1, 4);
  });

  it("x = linspace(1, 5, 5) → [1, 2, 3, 4, 5]", async () => {
    const r = await runPipeline(ctx("x = linspace(1, 5, 5)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
    expect(r.solution.real["0-2"]).toBeCloseTo(3, 4);
    expect(r.solution.real["0-4"]).toBeCloseTo(5, 4);
  });
});
