/**
 * Tests for rad2deg() — solver/functions/basic/rad2deg.ts
 * Element-wise conversion: radians → degrees (val * 180/π)
 */

import { describe, it, expect } from "vitest";
import { rad2deg } from "../../functions/basic/rad2deg";
import { runPipeline } from "../../pipeline";
import { ctx } from "../helpers";

// ── Direct call tests ──────────────────────────────────────────────────────────

describe("rad2deg — direct call: scalars", () => {
  it("0 → 0°", async () => {
    const r = await rad2deg([{ "0-0": 0 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });

  it("π → 180°", async () => {
    const r = await rad2deg([{ "0-0": Math.PI }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(180, 10);
  });

  it("π/2 → 90°", async () => {
    const r = await rad2deg([{ "0-0": Math.PI / 2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(90, 10);
  });

  it("2π → 360°", async () => {
    const r = await rad2deg([{ "0-0": 2 * Math.PI }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(360, 10);
  });

  it("π/4 → 45°", async () => {
    const r = await rad2deg([{ "0-0": Math.PI / 4 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(45, 10);
  });

  it("-π/2 → -90°", async () => {
    const r = await rad2deg([{ "0-0": -Math.PI / 2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-90, 10);
  });
});

describe("rad2deg — direct call: row vector", () => {
  it("[0, π/2, π, 3π/2] → [0, 90, 180, 270]", async () => {
    const r = await rad2deg([{
      "0-0": 0,
      "0-1": Math.PI / 2,
      "0-2": Math.PI,
      "0-3": 3 * Math.PI / 2,
    }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 8);
    expect(r["0-1"]).toBeCloseTo(90, 8);
    expect(r["0-2"]).toBeCloseTo(180, 8);
    expect(r["0-3"]).toBeCloseTo(270, 8);
  });
});

describe("rad2deg — direct call: edge cases", () => {
  it("empty matrix → empty result", async () => {
    const r = await rad2deg([{}], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(0);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("rad2deg — pipeline: scalars", () => {
  it("x = rad2deg(0) → 0", async () => {
    const r = await runPipeline(ctx("x = rad2deg(0)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });

  it("x = rad2deg(3.14159265) ≈ 180", async () => {
    const r = await runPipeline(ctx("x = rad2deg(3.14159265)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(180, 3);
  });

  it("roundtrip: deg2rad(90) → rad2deg → 90", async () => {
    const r = await runPipeline(ctx("x = rad2deg(1.5707963267948966)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(90, 4);
  });
});
