import { describe, test, expect } from "vitest";
import { parseCompound, termsToUnitString } from "../../units/parse-compound";
import { SCALE_UNIT_MAP } from "../../units/scale-unit-data";
import { PARSE_UNIT_MAP } from "../../units/parse-unit-data";
import { scaleUnits } from "../../steps/22-scale-units";
import { decomposeUnits } from "../../steps/23-decompose-units";
import type { SolveContext } from "../../types";

// ── Minimal mock context ──────────────────────────────────────────────────────
function mockCtx(overrides: Partial<SolveContext> = {}): SolveContext {
  const emptyBase: [number,number,number,number,number,number,number,number] = [0,0,0,0,0,0,0,0];
  return {
    eqId: "test", fileId: "", rawEquation: "", variableName: "", rhsString: "",
    documentEquations: [], currentBlockOrder: 0,
    constants: new Map(), unitList: [], scaleUnits: [], importedFunctions: [], cadParts: {}, datasets: new Map(),
    workingString: "", tokens: [], keyArray: [], variableArray: [], postfixArray: [],
    solution: {
      real: { "0-0": 1 }, imag: {}, size: "1x1",
      units: "", baseUnits: emptyBase, multiplier: 1, quantity: "",
    },
    display: { equation: "", solution: "", numericalModel: "", unitsModel: "", dimensionsModel: "", quantitiesModel: "" },
    errors: [],
    ...overrides,
  } as SolveContext;
}

// ── parseCompound ─────────────────────────────────────────────────────────────
describe("parseCompound", () => {
  test("single unit", () => {
    expect(parseCompound("m")).toEqual([{ symbol: "m", power: 1 }]);
  });
  test("unit with power", () => {
    expect(parseCompound("m^2")).toEqual([{ symbol: "m", power: 2 }]);
  });
  test("compound multiplication", () => {
    expect(parseCompound("kg*m")).toEqual([
      { symbol: "kg", power: 1 },
      { symbol: "m",  power: 1 },
    ]);
  });
  test("compound with division", () => {
    expect(parseCompound("m/s")).toEqual([
      { symbol: "m", power:  1 },
      { symbol: "s", power: -1 },
    ]);
  });
  test("kg*m/s^2", () => {
    const terms = parseCompound("kg*m/s^2");
    expect(terms).toContainEqual({ symbol: "kg", power: 1 });
    expect(terms).toContainEqual({ symbol: "m",  power: 1 });
    expect(terms).toContainEqual({ symbol: "s",  power: -2 });
  });
  test("N/m^2", () => {
    const terms = parseCompound("N/m^2");
    expect(terms).toContainEqual({ symbol: "N", power:  1 });
    expect(terms).toContainEqual({ symbol: "m", power: -2 });
  });
});

// ── SCALE_UNIT_MAP ────────────────────────────────────────────────────────────
describe("SCALE_UNIT_MAP", () => {
  test("km → conv_factor 1000, conv_unit m", () => {
    const entry = SCALE_UNIT_MAP.get("km");
    expect(entry?.conv_factor).toBe(1000);
    expect(entry?.conv_unit).toBe("m");
  });
  test("kN → conv_factor 1000, conv_unit N", () => {
    const entry = SCALE_UNIT_MAP.get("kN");
    expect(entry?.conv_factor).toBe(1000);
    expect(entry?.conv_unit).toBe("N");
  });
  test("MPa → conv_factor 1e6, conv_unit Pa", () => {
    const entry = SCALE_UNIT_MAP.get("MPa");
    expect(entry?.conv_factor).toBe(1e6);
    expect(entry?.conv_unit).toBe("Pa");
  });
  test("mm → 0.001 m", () => {
    const entry = SCALE_UNIT_MAP.get("mm");
    expect(entry?.conv_factor).toBe(0.001);
    expect(entry?.conv_unit).toBe("m");
  });
  test("has 309 entries", () => {
    expect(SCALE_UNIT_MAP.size).toBe(309);
  });
});

// ── PARSE_UNIT_MAP ────────────────────────────────────────────────────────────
describe("PARSE_UNIT_MAP", () => {
  test("m → length dimension [0,0,0,1,0,0,0,0]", () => {
    const entry = PARSE_UNIT_MAP.get("m");
    expect(entry?.baseArray).toEqual([0, 0, 0, 1, 0, 0, 0, 0]);
  });
  test("N → force dimensions", () => {
    const entry = PARSE_UNIT_MAP.get("N");
    expect(entry).toBeDefined();
  });
});

// ── Step 22: scaleUnits ───────────────────────────────────────────────────────
describe("step 22 – scaleUnits", () => {
  test("km: value 5 → 5000 m", async () => {
    const ctx = mockCtx({ solution: { real: { "0-0": 5 }, imag: {}, size: "1x1", units: "km", baseUnits: [0,0,0,0,0,0,0,0], multiplier: 1, quantity: "" } });
    const result = await scaleUnits(ctx);
    expect(result.solution.real["0-0"]).toBeCloseTo(5000);
    expect(result.solution.units).toBe("m");
  });

  test("kN: value 10 → 10000 N", async () => {
    const ctx = mockCtx({ solution: { real: { "0-0": 10 }, imag: {}, size: "1x1", units: "kN", baseUnits: [0,0,0,0,0,0,0,0], multiplier: 1, quantity: "" } });
    const result = await scaleUnits(ctx);
    expect(result.solution.real["0-0"]).toBeCloseTo(10000);
    expect(result.solution.units).toBe("N");
  });

  test("mm: value 250 → 0.25 m", async () => {
    const ctx = mockCtx({ solution: { real: { "0-0": 250 }, imag: {}, size: "1x1", units: "mm", baseUnits: [0,0,0,0,0,0,0,0], multiplier: 1, quantity: "" } });
    const result = await scaleUnits(ctx);
    expect(result.solution.real["0-0"]).toBeCloseTo(0.25);
  });

  test("kN/m^2: value 1 → 1000 N/m^2", async () => {
    const ctx = mockCtx({ solution: { real: { "0-0": 1 }, imag: {}, size: "1x1", units: "kN/m^2", baseUnits: [0,0,0,0,0,0,0,0], multiplier: 1, quantity: "" } });
    const result = await scaleUnits(ctx);
    expect(result.solution.real["0-0"]).toBeCloseTo(1000);
  });

  test("no units: pass through unchanged", async () => {
    const ctx = mockCtx({ solution: { real: { "0-0": 42 }, imag: {}, size: "1x1", units: "", baseUnits: [0,0,0,0,0,0,0,0], multiplier: 1, quantity: "" } });
    const result = await scaleUnits(ctx);
    expect(result.solution.real["0-0"]).toBe(42);
  });

  test("temperature C: 100 → 373.15 K", async () => {
    const ctx = mockCtx({ solution: { real: { "0-0": 100 }, imag: {}, size: "1x1", units: "C", baseUnits: [0,0,0,0,0,0,0,0], multiplier: 1, quantity: "" } });
    const result = await scaleUnits(ctx);
    expect(result.solution.real["0-0"]).toBeCloseTo(373.15);
    expect(result.solution.units).toBe("K");
  });
});

// ── Step 23: decomposeUnits ───────────────────────────────────────────────────
describe("step 23 – decomposeUnits", () => {
  test("m → length dimension", async () => {
    const ctx = mockCtx({ solution: { real: { "0-0": 1 }, imag: {}, size: "1x1", units: "m", baseUnits: [0,0,0,0,0,0,0,0], multiplier: 1, quantity: "" } });
    const result = await decomposeUnits(ctx);
    expect(result.solution.baseUnits[3]).toBe(1); // m index is 3
  });

  test("N → has negative time and positive mass/length", async () => {
    const ctx = mockCtx({ solution: { real: { "0-0": 1 }, imag: {}, size: "1x1", units: "N", baseUnits: [0,0,0,0,0,0,0,0], multiplier: 1, quantity: "" } });
    const result = await decomposeUnits(ctx);
    expect(result.solution.baseUnits[2]).toBeLessThan(0); // s exponent negative
  });
});
