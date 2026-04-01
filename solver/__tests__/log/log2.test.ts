/**
 * Tests for log2() — solver/functions/log/log2.ts
 * Element-wise base-2 logarithm.
 */

import { describe, it, expect } from "vitest";
import { log2 } from "../../functions/log/log2";
import { runPipeline } from "../../pipeline";
import { ctx } from "../helpers";

// ── Direct call tests ──────────────────────────────────────────────────────────

describe("log2 — direct call: scalars", () => {
  it("log2(1) → 0", async () => {
    const r = await log2([{ "0-0": 1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });

  it("log2(2) → 1", async () => {
    const r = await log2([{ "0-0": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
  });

  it("log2(4) → 2", async () => {
    const r = await log2([{ "0-0": 4 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(2, 10);
  });

  it("log2(8) → 3", async () => {
    const r = await log2([{ "0-0": 8 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(3, 10);
  });

  it("log2(1024) → 10", async () => {
    const r = await log2([{ "0-0": 1024 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(10, 10);
  });

  it("log2(0.5) → -1", async () => {
    const r = await log2([{ "0-0": 0.5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-1, 10);
  });
});

describe("log2 — direct call: row vector", () => {
  it("[1, 2, 4, 8] → [0, 1, 2, 3]", async () => {
    const r = await log2([{ "0-0": 1, "0-1": 2, "0-2": 4, "0-3": 8 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 8);
    expect(r["0-1"]).toBeCloseTo(1, 8);
    expect(r["0-2"]).toBeCloseTo(2, 8);
    expect(r["0-3"]).toBeCloseTo(3, 8);
  });
});

describe("log2 — direct call: edge cases", () => {
  it("empty matrix → empty result", async () => {
    const r = await log2([{}], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(0);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("log2 — pipeline: scalars", () => {
  it("x = log2(1) → 0", async () => {
    const r = await runPipeline(ctx("x = log2(1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });

  it("x = log2(2) → 1", async () => {
    const r = await runPipeline(ctx("x = log2(2)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
  });

  it("x = log2(8) → 3", async () => {
    const r = await runPipeline(ctx("x = log2(8)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(3, 4);
  });

  it("x = log2(0.25) → -2", async () => {
    const r = await runPipeline(ctx("x = log2(0.25)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(-2, 4);
  });
});
