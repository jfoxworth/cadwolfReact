import { describe, it, expect } from "vitest";
import { hypot } from "../../functions/basic/hypot";
import { runPipeline } from "../../pipeline";
import { ctx } from "../helpers";

describe("hypot — direct call", () => {
  it("hypot(3, 4) = 5", async () => {
    expect((await hypot([{ "0-0": 3 }, { "0-0": 4 }], ctx("x=0")))["0-0"]).toBeCloseTo(5, 10);
  });
  it("hypot(0, 0) = 0", async () => {
    expect((await hypot([{ "0-0": 0 }, { "0-0": 0 }], ctx("x=0")))["0-0"]).toBeCloseTo(0, 10);
  });
  it("hypot(1, 0) = 1", async () => {
    expect((await hypot([{ "0-0": 1 }, { "0-0": 0 }], ctx("x=0")))["0-0"]).toBeCloseTo(1, 10);
  });
  it("hypot(5, 12) = 13", async () => {
    expect((await hypot([{ "0-0": 5 }, { "0-0": 12 }], ctx("x=0")))["0-0"]).toBeCloseTo(13, 8);
  });
  it("hypot(-3, 4) = 5 (negative component)", async () => {
    expect((await hypot([{ "0-0": -3 }, { "0-0": 4 }], ctx("x=0")))["0-0"]).toBeCloseTo(5, 10);
  });
});

describe("hypot — pipeline", () => {
  it("x = hypot(3, 4) → 5", async () => {
    const r = await runPipeline(ctx("x = hypot(3, 4)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(5, 4);
  });
});

import { solveDocument } from "../../worker/document-solver";
import type { OrderedBlock } from "../../types";

describe("hypot — unit preservation (inline units)", () => {
  async function solveUnit(raw: string) {
    const block: OrderedBlock = { id: "b1", order: 1, type: "EQUATION", definition: { raw, variableName: "y" } };
    const r = await solveDocument([block], "b1", []);
    return r.results.find(res => res.blockId === "b1");
  }

  it("hypot(3 m, 4 m) → preserves meter dimension", async () => {
    const res = await solveUnit("y = hypot(3 m, 4 m)");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });
  it("hypot(3 kg*m/s^2, 4 kg*m/s^2) → preserves combined units", async () => {
    const res = await solveUnit("y = hypot(3 kg*m/s^2, 4 kg*m/s^2)");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });
  it("hypot(3 km, 4 km) → preserves scaled unit", async () => {
    const res = await solveUnit("y = hypot(3 km, 4 km)");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });
  it("hypot(25 kN, 25 kN) → preserves complex scaled unit", async () => {
    const res = await solveUnit("y = hypot(25 kN, 25 kN)");
    expect(res?.solution?.baseUnits?.some(v => v !== 0)).toBe(true);
  });
});
