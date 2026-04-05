import { describe, it, expect } from "vitest";
import { replaceCad } from "@/solver/steps/11-replace-cad";
import type { SolveContext } from "@/solver/types";

// Minimal SolveContext stub — only the fields step 11 reads/writes
function makeCtx(tokens: string[], cadParts: Record<string, { partId: string; properties: Record<string, number> }>): SolveContext {
  return {
    eqId: "test",
    fileId: "1",
    rawEquation: "",
    variableName: "",
    rhsString: "",
    documentEquations: [],
    currentBlockOrder: 0,
    constants: new Map(),
    unitList: [],
    scaleUnits: [],
    importedFunctions: [],
    cadParts,
    datasets: new Map(),
    workingString: "",
    tokens,
    keyArray: tokens.map(() => 0),
    variableArray: [],
    postfixArray: [],
    solution: { real: {}, imag: {}, size: "1x1", units: "", baseUnits: [0,0,0,0,0,0,0,0], multiplier: 1, quantity: "" },
    display: { equation: "", solution: "", numericalModel: "", unitsModel: "", dimensionsModel: "", quantitiesModel: "" },
    errors: [],
  } as SolveContext;
}

const FIXTURE_PARTS = {
  EyeBolt: {
    partId: "JHD123",
    properties: { mass: 0.045, volume: 5.7e-6, surface: 0.002, weight: 0.441, density: 7900 },
  },
};

describe("replaceCad (step 11)", () => {
  it("replaces EyeBolt.mass token with numeric value and kg unit", async () => {
    const ctx = makeCtx(["EyeBolt.mass"], FIXTURE_PARTS);
    const result = await replaceCad(ctx);
    expect(result.tokens[0]).toBe("0.045");
    expect(result.keyArray[0]).toBe(0);
    expect(result.tokens[1]).toBe("kg");
    expect(result.keyArray[1]).toBe(1);
  });

  it("replaces EyeBolt.volume with m^3 unit", async () => {
    const ctx = makeCtx(["EyeBolt.volume"], FIXTURE_PARTS);
    const result = await replaceCad(ctx);
    expect(result.tokens[0]).toBe((5.7e-6).toString());
    expect(result.tokens[1]).toBe("m^3");
  });

  it("replaces EyeBolt.density with kg/m^3 unit", async () => {
    const ctx = makeCtx(["EyeBolt.density"], FIXTURE_PARTS);
    const result = await replaceCad(ctx);
    expect(result.tokens[0]).toBe("7900");
    expect(result.tokens[1]).toBe("kg/m^3");
  });

  it("leaves unknown part token unchanged", async () => {
    const ctx = makeCtx(["Foo.mass"], FIXTURE_PARTS);
    const result = await replaceCad(ctx);
    expect(result.tokens).toEqual(["Foo.mass"]);
    expect(result.tokens.length).toBe(1);
  });

  it("leaves unknown property token unchanged", async () => {
    const ctx = makeCtx(["EyeBolt.unknownProp"], FIXTURE_PARTS);
    const result = await replaceCad(ctx);
    expect(result.tokens).toEqual(["EyeBolt.unknownProp"]);
    expect(result.tokens.length).toBe(1);
  });

  it("handles mixed tokens — replaces CAD ref, leaves others alone", async () => {
    const ctx = makeCtx(["F", "=", "EyeBolt.weight", "*", "9.81"], FIXTURE_PARTS);
    const result = await replaceCad(ctx);
    // EyeBolt.weight → 0.441 + "N" unit token
    const wtIdx = result.tokens.indexOf("0.441");
    expect(wtIdx).toBeGreaterThanOrEqual(0);
    expect(result.tokens[wtIdx + 1]).toBe("N");
    // Other tokens unchanged
    expect(result.tokens).toContain("F");
    expect(result.tokens).toContain("=");
    expect(result.tokens).toContain("9.81");
  });

  it("is case-SENSITIVE — eyebolt.mass does NOT match EyeBolt part", async () => {
    // Document this behavior explicitly: part lookup is by exact key
    const ctx = makeCtx(["eyebolt.mass"], FIXTURE_PARTS);
    const result = await replaceCad(ctx);
    // Token should be unchanged because "eyebolt" !== "EyeBolt"
    expect(result.tokens).toEqual(["eyebolt.mass"]);
  });

  it("returns unchanged context when cadParts is empty", async () => {
    const ctx = makeCtx(["EyeBolt.mass"], {});
    const result = await replaceCad(ctx);
    expect(result.tokens).toEqual(["EyeBolt.mass"]);
  });
});
