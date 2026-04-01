/**
 * Tests for deg2rad() — solver/functions/basic/deg2rad.ts
 * Element-wise conversion: degrees → radians (val * π/180)
 */

import { describe, it, expect } from "vitest";
import { deg2rad } from "../../functions/basic/deg2rad";
import { runPipeline } from "../../pipeline";
import { ctx } from "../helpers";

const D2R = Math.PI / 180;

// ── Direct call tests ──────────────────────────────────────────────────────────

describe("deg2rad — direct call: scalars", () => {
  it("0° → 0", async () => {
    const r = await deg2rad([{ "0-0": 0 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 10);
  });

  it("180° → π", async () => {
    const r = await deg2rad([{ "0-0": 180 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.PI, 10);
  });

  it("90° → π/2", async () => {
    const r = await deg2rad([{ "0-0": 90 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.PI / 2, 10);
  });

  it("360° → 2π", async () => {
    const r = await deg2rad([{ "0-0": 360 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(2 * Math.PI, 10);
  });

  it("45° → π/4", async () => {
    const r = await deg2rad([{ "0-0": 45 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(Math.PI / 4, 10);
  });

  it("-90° → -π/2", async () => {
    const r = await deg2rad([{ "0-0": -90 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(-Math.PI / 2, 10);
  });
});

describe("deg2rad — direct call: row vector", () => {
  it("[0, 90, 180, 270] → [0, π/2, π, 3π/2]", async () => {
    const r = await deg2rad([{ "0-0": 0, "0-1": 90, "0-2": 180, "0-3": 270 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(0, 8);
    expect(r["0-1"]).toBeCloseTo(Math.PI / 2, 8);
    expect(r["0-2"]).toBeCloseTo(Math.PI, 8);
    expect(r["0-3"]).toBeCloseTo(3 * Math.PI / 2, 8);
  });
});

describe("deg2rad — direct call: edge cases", () => {
  it("empty matrix → empty result", async () => {
    const r = await deg2rad([{}], ctx("x=0"));
    expect(Object.keys(r)).toHaveLength(0);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("deg2rad — pipeline: scalars", () => {
  it("x = deg2rad(0) → 0", async () => {
    const r = await runPipeline(ctx("x = deg2rad(0)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });

  it("x = deg2rad(180) → π", async () => {
    const r = await runPipeline(ctx("x = deg2rad(180)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.PI, 4);
  });

  it("x = deg2rad(90) → π/2", async () => {
    const r = await runPipeline(ctx("x = deg2rad(90)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.PI / 2, 4);
  });

  it("x = deg2rad(45) → π/4", async () => {
    const r = await runPipeline(ctx("x = deg2rad(45)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.PI / 4, 4);
  });
});
