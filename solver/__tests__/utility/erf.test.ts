/**
 * Tests for erf() — solver/functions/utility/erf.ts
 * Error function via Abramowitz & Stegun 7.1.26 approximation (max error ≤ 1.5e-7).
 *
 * Key values:
 *   erf(0)   = 0
 *   erf(∞)   ≈ 1
 *   erf(-x)  = -erf(x)   (odd function)
 *   erf(1)   ≈ 0.8427008
 *   erf(0.5) ≈ 0.5204999
 */

import { describe, it, expect } from "vitest";
import { erf } from "../../functions/utility/erf";
import { runPipeline } from "../../pipeline";
import { ctx } from "../helpers";

// ── Direct call tests ──────────────────────────────────────────────────────────

describe("erf — direct call: known values", () => {
  it("erf(0) = 0", async () => {
    const r = await erf([{ "0-0": 0 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 7);
  });

  it("erf(1) ≈ 0.8427007929", async () => {
    const r = await erf([{ "0-0": 1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0.8427007929, 5);
  });

  it("erf(0.5) ≈ 0.5204998778", async () => {
    const r = await erf([{ "0-0": 0.5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0.5204998778, 5);
  });

  it("erf(2) ≈ 0.9953222650", async () => {
    const r = await erf([{ "0-0": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0.9953222650, 5);
  });

  it("erf(large) ≈ 1", async () => {
    const r = await erf([{ "0-0": 10 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 5);
  });
});

describe("erf — direct call: odd function symmetry", () => {
  it("erf(-1) = -erf(1)", async () => {
    const r = await erf([{ "0-0": -1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-0.8427007929, 5);
  });

  it("erf(-0.5) = -erf(0.5)", async () => {
    const r = await erf([{ "0-0": -0.5 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-0.5204998778, 5);
  });
});

describe("erf — direct call: row vector", () => {
  it("[0, 1, -1] → [0, 0.8427, -0.8427]", async () => {
    const r = await erf([{ "0-0": 0, "0-1": 1, "0-2": -1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 6);
    expect(r["0-1"]).toBeCloseTo(0.8427007929, 5);
    expect(r["0-2"]).toBeCloseTo(-0.8427007929, 5);
  });
});

describe("erf — direct call: edge cases", () => {
  it("empty matrix → empty result", async () => {
    const r = await erf([{}], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(0);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("erf — pipeline: scalars", () => {
  it("x = erf(0) → 0", async () => {
    const r = await runPipeline(ctx("x = erf(0)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });

  it("x = erf(1) ≈ 0.8427", async () => {
    const r = await runPipeline(ctx("x = erf(1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0.8427, 3);
  });

  it("x = erf(-1) ≈ -0.8427", async () => {
    const r = await runPipeline(ctx("x = erf(-1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(-0.8427, 3);
  });
});
