import { describe, it, expect } from "vitest";
import { trunc } from "../../functions/basic/trunc";
import { runPipeline } from "../../pipeline";
import { ctx } from "../helpers";

describe("trunc — direct call", () => {
  it("trunc(3.9) = 3", async () => {
    expect((await trunc([{ "0-0": 3.9 }], ctx("x=0")))["0-0"]).toBe(3);
  });
  it("trunc(-3.9) = -3 (toward zero, not floor)", async () => {
    expect((await trunc([{ "0-0": -3.9 }], ctx("x=0")))["0-0"]).toBe(-3);
  });
  it("trunc(0.1) = 0", async () => {
    expect((await trunc([{ "0-0": 0.1 }], ctx("x=0")))["0-0"]).toBe(0);
  });
  it("trunc(-0.1) = 0 (toward zero)", async () => {
    // Math.trunc(-0.1) returns -0; test numerically
    expect((await trunc([{ "0-0": -0.1 }], ctx("x=0")))["0-0"]).toBeCloseTo(0, 10);
  });
  it("trunc(5) = 5", async () => {
    expect((await trunc([{ "0-0": 5 }], ctx("x=0")))["0-0"]).toBe(5);
  });
  it("row vector element-wise", async () => {
    const r = await trunc([{ "0-0": 1.9, "0-1": -2.1, "0-2": 0.5 }], ctx("x=0"));
    expect(r["0-0"]).toBe(1);
    expect(r["0-1"]).toBe(-2);
    expect(r["0-2"]).toBe(0);
  });
});

describe("trunc — pipeline", () => {
  it("x = trunc(3.9) → 3", async () => {
    const r = await runPipeline(ctx("x = trunc(3.9)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBe(3);
  });
  it("x = trunc(-3.9) → -3", async () => {
    const r = await runPipeline(ctx("x = trunc(-3.9)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBe(-3);
  });
});

import { solveDocument } from "../../worker/document-solver";
import type { OrderedBlock } from "../../types";

describe("trunc — unit preservation (inline units)", () => {
  async function solveUnit(raw: string) {
    const block: OrderedBlock = { id: "b1", order: 1, type: "EQUATION", definition: { raw, variableName: "y" } };
    const r = await solveDocument([block], "b1", []);
    return r.results.find(res => res.blockId === "b1");
  }

  it("trunc(3 m) → preserves meter dimension", async () => {
    const res = await solveUnit("y = trunc(3 m)");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });
  it("trunc(3 kg*m/s^2) → preserves combined units", async () => {
    const res = await solveUnit("y = trunc(3 kg*m/s^2)");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });
  it("trunc(3 km) → preserves scaled unit", async () => {
    const res = await solveUnit("y = trunc(3 km)");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });
  it("trunc(25 kN) → preserves complex scaled unit", async () => {
    const res = await solveUnit("y = trunc(25 kN)");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });
});
