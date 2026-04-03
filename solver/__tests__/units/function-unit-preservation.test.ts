/**
 * Comprehensive unit-preservation tests for unit-transparent builtin functions.
 *
 * A "unit-transparent" function is one whose output has the same physical
 * dimension as its first argument (same baseUnits array).
 *
 * For each function we test:
 *   Test 1 - Basic unit:        f(3 m)       → baseUnits has at least one non-zero (meters dim)
 *   Test 2 - Combined units:    f(3 kg*m/s^2) → baseUnits non-zero
 *   Test 3 - Scaled unit:       f(3 km)       → baseUnits non-zero (km → m in SI)
 *   Test 4 - Complex scaled:    f(25 kN)      → baseUnits non-zero (kN → kg·m/s²)
 *
 * Vector functions use a pre-defined vector variable x = [3, 5, 7] m.
 */

import { describe, it, expect } from "vitest";
import { solveDocument } from "../../worker/document-solver";
import type { OrderedBlock } from "../../types";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Solve a single scalar equation. Returns the result for blockId "b1". */
async function solve(raw: string, variableName: string) {
  const block: OrderedBlock = {
    id: "b1",
    order: 1,
    type: "EQUATION",
    definition: { raw, variableName },
  };
  const r = await solveDocument([block], "b1", []);
  return r.results.find((res) => res.blockId === "b1");
}

/**
 * Solve a two-block sequence where block v1 defines a vector variable
 * `x = [3, 5, 7] m` and block b1 applies the function.
 * Returns the result for blockId "b1".
 */
async function solveVec(fnRaw: string, variableName: string) {
  const blocks: OrderedBlock[] = [
    {
      id: "v1",
      order: 1,
      type: "EQUATION",
      definition: { raw: "x = [3, 5, 7] m", variableName: "x" },
    },
    {
      id: "b1",
      order: 2,
      type: "EQUATION",
      definition: { raw: fnRaw, variableName },
    },
  ];
  const r1 = await solveDocument(blocks, "v1", []);
  const r2 = await solveDocument(blocks, "b1", r1.resolvedMap);
  return r2.results.find((res) => res.blockId === "b1");
}

/** Convenience: returns true if the result's baseUnits has at least one non-zero entry. */
function hasUnits(res: Awaited<ReturnType<typeof solve>>) {
  return res?.solution?.baseUnits?.some((v) => v !== 0) ?? false;
}

// ─── abs ────────────────────────────────────────────────────────────────────

describe("abs — unit preservation", () => {
  it("abs(3 m) → preserves meter dimension", async () => {
    const res = await solve("y = abs(3 m)", "y");
    expect(hasUnits(res)).toBe(true);
  });

  it("abs(3 kg*m/s^2) → preserves combined units", async () => {
    const res = await solve("y = abs(3 kg*m/s^2)", "y");
    expect(hasUnits(res)).toBe(true);
  });

  it("abs(3 km) → preserves scaled unit", async () => {
    const res = await solve("y = abs(3 km)", "y");
    expect(hasUnits(res)).toBe(true);
  });

  it("abs(25 kN) → preserves complex scaled unit", async () => {
    const res = await solve("y = abs(25 kN)", "y");
    expect(hasUnits(res)).toBe(true);
  });
});

// ─── round ──────────────────────────────────────────────────────────────────

describe("round — unit preservation", () => {
  it("round(3 m) → preserves meter dimension", async () => {
    const res = await solve("y = round(3 m)", "y");
    expect(hasUnits(res)).toBe(true);
  });

  it("round(3 kg*m/s^2) → preserves combined units", async () => {
    const res = await solve("y = round(3 kg*m/s^2)", "y");
    expect(hasUnits(res)).toBe(true);
  });

  it("round(3 km) → preserves scaled unit", async () => {
    const res = await solve("y = round(3 km)", "y");
    expect(hasUnits(res)).toBe(true);
  });

  it("round(25 kN) → preserves complex scaled unit", async () => {
    const res = await solve("y = round(25 kN)", "y");
    expect(hasUnits(res)).toBe(true);
  });
});

// ─── floor ──────────────────────────────────────────────────────────────────

describe("floor — unit preservation", () => {
  it("floor(3 m) → preserves meter dimension", async () => {
    const res = await solve("y = floor(3 m)", "y");
    expect(hasUnits(res)).toBe(true);
  });

  it("floor(3 kg*m/s^2) → preserves combined units", async () => {
    const res = await solve("y = floor(3 kg*m/s^2)", "y");
    expect(hasUnits(res)).toBe(true);
  });

  it("floor(3 km) → preserves scaled unit", async () => {
    const res = await solve("y = floor(3 km)", "y");
    expect(hasUnits(res)).toBe(true);
  });

  it("floor(25 kN) → preserves complex scaled unit", async () => {
    const res = await solve("y = floor(25 kN)", "y");
    expect(hasUnits(res)).toBe(true);
  });
});

// ─── ceil ───────────────────────────────────────────────────────────────────

describe("ceil — unit preservation", () => {
  it("ceil(3 m) → preserves meter dimension", async () => {
    const res = await solve("y = ceil(3 m)", "y");
    expect(hasUnits(res)).toBe(true);
  });

  it("ceil(3 kg*m/s^2) → preserves combined units", async () => {
    const res = await solve("y = ceil(3 kg*m/s^2)", "y");
    expect(hasUnits(res)).toBe(true);
  });

  it("ceil(3 km) → preserves scaled unit", async () => {
    const res = await solve("y = ceil(3 km)", "y");
    expect(hasUnits(res)).toBe(true);
  });

  it("ceil(25 kN) → preserves complex scaled unit", async () => {
    const res = await solve("y = ceil(25 kN)", "y");
    expect(hasUnits(res)).toBe(true);
  });
});

// ─── trunc ──────────────────────────────────────────────────────────────────

describe("trunc — unit preservation", () => {
  it("trunc(3 m) → preserves meter dimension", async () => {
    const res = await solve("y = trunc(3 m)", "y");
    expect(hasUnits(res)).toBe(true);
  });

  it("trunc(3 kg*m/s^2) → preserves combined units", async () => {
    const res = await solve("y = trunc(3 kg*m/s^2)", "y");
    expect(hasUnits(res)).toBe(true);
  });

  it("trunc(3 km) → preserves scaled unit", async () => {
    const res = await solve("y = trunc(3 km)", "y");
    expect(hasUnits(res)).toBe(true);
  });

  it("trunc(25 kN) → preserves complex scaled unit", async () => {
    const res = await solve("y = trunc(25 kN)", "y");
    expect(hasUnits(res)).toBe(true);
  });
});

// ─── min ────────────────────────────────────────────────────────────────────

describe("min — unit preservation", () => {
  it("min([3,5,7] m) → preserves meter dimension", async () => {
    const res = await solveVec("y = min(x)", "y");
    expect(hasUnits(res)).toBe(true);
  });

  it("min with combined units vector", async () => {
    const blocks: OrderedBlock[] = [
      { id: "v1", order: 1, type: "EQUATION", definition: { raw: "x = [3, 5, 7] kg*m/s^2", variableName: "x" } },
      { id: "b1", order: 2, type: "EQUATION", definition: { raw: "y = min(x)", variableName: "y" } },
    ];
    const r1 = await solveDocument(blocks, "v1", []);
    const r2 = await solveDocument(blocks, "b1", r1.resolvedMap);
    const res = r2.results.find((r) => r.blockId === "b1");
    expect(hasUnits(res)).toBe(true);
  });

  it("min([3,5,7] km) → preserves scaled unit", async () => {
    const blocks: OrderedBlock[] = [
      { id: "v1", order: 1, type: "EQUATION", definition: { raw: "x = [3, 5, 7] km", variableName: "x" } },
      { id: "b1", order: 2, type: "EQUATION", definition: { raw: "y = min(x)", variableName: "y" } },
    ];
    const r1 = await solveDocument(blocks, "v1", []);
    const r2 = await solveDocument(blocks, "b1", r1.resolvedMap);
    const res = r2.results.find((r) => r.blockId === "b1");
    expect(hasUnits(res)).toBe(true);
  });

  it("min([25,30,35] kN) → preserves complex scaled unit", async () => {
    const blocks: OrderedBlock[] = [
      { id: "v1", order: 1, type: "EQUATION", definition: { raw: "x = [25, 30, 35] kN", variableName: "x" } },
      { id: "b1", order: 2, type: "EQUATION", definition: { raw: "y = min(x)", variableName: "y" } },
    ];
    const r1 = await solveDocument(blocks, "v1", []);
    const r2 = await solveDocument(blocks, "b1", r1.resolvedMap);
    const res = r2.results.find((r) => r.blockId === "b1");
    expect(hasUnits(res)).toBe(true);
  });
});

// ─── max ────────────────────────────────────────────────────────────────────

describe("max — unit preservation", () => {
  it("max([3,5,7] m) → preserves meter dimension", async () => {
    const res = await solveVec("y = max(x)", "y");
    expect(hasUnits(res)).toBe(true);
  });

  it("max with combined units vector", async () => {
    const blocks: OrderedBlock[] = [
      { id: "v1", order: 1, type: "EQUATION", definition: { raw: "x = [3, 5, 7] kg*m/s^2", variableName: "x" } },
      { id: "b1", order: 2, type: "EQUATION", definition: { raw: "y = max(x)", variableName: "y" } },
    ];
    const r1 = await solveDocument(blocks, "v1", []);
    const r2 = await solveDocument(blocks, "b1", r1.resolvedMap);
    const res = r2.results.find((r) => r.blockId === "b1");
    expect(hasUnits(res)).toBe(true);
  });

  it("max([3,5,7] km) → preserves scaled unit", async () => {
    const blocks: OrderedBlock[] = [
      { id: "v1", order: 1, type: "EQUATION", definition: { raw: "x = [3, 5, 7] km", variableName: "x" } },
      { id: "b1", order: 2, type: "EQUATION", definition: { raw: "y = max(x)", variableName: "y" } },
    ];
    const r1 = await solveDocument(blocks, "v1", []);
    const r2 = await solveDocument(blocks, "b1", r1.resolvedMap);
    const res = r2.results.find((r) => r.blockId === "b1");
    expect(hasUnits(res)).toBe(true);
  });

  it("max([25,30,35] kN) → preserves complex scaled unit", async () => {
    const blocks: OrderedBlock[] = [
      { id: "v1", order: 1, type: "EQUATION", definition: { raw: "x = [25, 30, 35] kN", variableName: "x" } },
      { id: "b1", order: 2, type: "EQUATION", definition: { raw: "y = max(x)", variableName: "y" } },
    ];
    const r1 = await solveDocument(blocks, "v1", []);
    const r2 = await solveDocument(blocks, "b1", r1.resolvedMap);
    const res = r2.results.find((r) => r.blockId === "b1");
    expect(hasUnits(res)).toBe(true);
  });
});

// ─── mean ───────────────────────────────────────────────────────────────────

describe("mean — unit preservation", () => {
  it("mean([3,5,7] m) → preserves meter dimension", async () => {
    const res = await solveVec("y = mean(x)", "y");
    expect(hasUnits(res)).toBe(true);
  });

  it("mean with combined units vector", async () => {
    const blocks: OrderedBlock[] = [
      { id: "v1", order: 1, type: "EQUATION", definition: { raw: "x = [3, 5, 7] kg*m/s^2", variableName: "x" } },
      { id: "b1", order: 2, type: "EQUATION", definition: { raw: "y = mean(x)", variableName: "y" } },
    ];
    const r1 = await solveDocument(blocks, "v1", []);
    const r2 = await solveDocument(blocks, "b1", r1.resolvedMap);
    const res = r2.results.find((r) => r.blockId === "b1");
    expect(hasUnits(res)).toBe(true);
  });

  it("mean([3,5,7] km) → preserves scaled unit", async () => {
    const blocks: OrderedBlock[] = [
      { id: "v1", order: 1, type: "EQUATION", definition: { raw: "x = [3, 5, 7] km", variableName: "x" } },
      { id: "b1", order: 2, type: "EQUATION", definition: { raw: "y = mean(x)", variableName: "y" } },
    ];
    const r1 = await solveDocument(blocks, "v1", []);
    const r2 = await solveDocument(blocks, "b1", r1.resolvedMap);
    const res = r2.results.find((r) => r.blockId === "b1");
    expect(hasUnits(res)).toBe(true);
  });

  it("mean([25,30,35] kN) → preserves complex scaled unit", async () => {
    const blocks: OrderedBlock[] = [
      { id: "v1", order: 1, type: "EQUATION", definition: { raw: "x = [25, 30, 35] kN", variableName: "x" } },
      { id: "b1", order: 2, type: "EQUATION", definition: { raw: "y = mean(x)", variableName: "y" } },
    ];
    const r1 = await solveDocument(blocks, "v1", []);
    const r2 = await solveDocument(blocks, "b1", r1.resolvedMap);
    const res = r2.results.find((r) => r.blockId === "b1");
    expect(hasUnits(res)).toBe(true);
  });
});

// ─── median ─────────────────────────────────────────────────────────────────

describe("median — unit preservation", () => {
  it("median([3,5,7] m) → preserves meter dimension", async () => {
    const res = await solveVec("y = median(x)", "y");
    expect(hasUnits(res)).toBe(true);
  });

  it("median with combined units vector", async () => {
    const blocks: OrderedBlock[] = [
      { id: "v1", order: 1, type: "EQUATION", definition: { raw: "x = [3, 5, 7] kg*m/s^2", variableName: "x" } },
      { id: "b1", order: 2, type: "EQUATION", definition: { raw: "y = median(x)", variableName: "y" } },
    ];
    const r1 = await solveDocument(blocks, "v1", []);
    const r2 = await solveDocument(blocks, "b1", r1.resolvedMap);
    const res = r2.results.find((r) => r.blockId === "b1");
    expect(hasUnits(res)).toBe(true);
  });

  it("median([3,5,7] km) → preserves scaled unit", async () => {
    const blocks: OrderedBlock[] = [
      { id: "v1", order: 1, type: "EQUATION", definition: { raw: "x = [3, 5, 7] km", variableName: "x" } },
      { id: "b1", order: 2, type: "EQUATION", definition: { raw: "y = median(x)", variableName: "y" } },
    ];
    const r1 = await solveDocument(blocks, "v1", []);
    const r2 = await solveDocument(blocks, "b1", r1.resolvedMap);
    const res = r2.results.find((r) => r.blockId === "b1");
    expect(hasUnits(res)).toBe(true);
  });

  it("median([25,30,35] kN) → preserves complex scaled unit", async () => {
    const blocks: OrderedBlock[] = [
      { id: "v1", order: 1, type: "EQUATION", definition: { raw: "x = [25, 30, 35] kN", variableName: "x" } },
      { id: "b1", order: 2, type: "EQUATION", definition: { raw: "y = median(x)", variableName: "y" } },
    ];
    const r1 = await solveDocument(blocks, "v1", []);
    const r2 = await solveDocument(blocks, "b1", r1.resolvedMap);
    const res = r2.results.find((r) => r.blockId === "b1");
    expect(hasUnits(res)).toBe(true);
  });
});

// ─── sum ────────────────────────────────────────────────────────────────────

describe("sum — unit preservation", () => {
  it("sum([3,5,7] m) → preserves meter dimension", async () => {
    const res = await solveVec("y = sum(x)", "y");
    expect(hasUnits(res)).toBe(true);
  });

  it("sum with combined units vector", async () => {
    const blocks: OrderedBlock[] = [
      { id: "v1", order: 1, type: "EQUATION", definition: { raw: "x = [3, 5, 7] kg*m/s^2", variableName: "x" } },
      { id: "b1", order: 2, type: "EQUATION", definition: { raw: "y = sum(x)", variableName: "y" } },
    ];
    const r1 = await solveDocument(blocks, "v1", []);
    const r2 = await solveDocument(blocks, "b1", r1.resolvedMap);
    const res = r2.results.find((r) => r.blockId === "b1");
    expect(hasUnits(res)).toBe(true);
  });

  it("sum([3,5,7] km) → preserves scaled unit", async () => {
    const blocks: OrderedBlock[] = [
      { id: "v1", order: 1, type: "EQUATION", definition: { raw: "x = [3, 5, 7] km", variableName: "x" } },
      { id: "b1", order: 2, type: "EQUATION", definition: { raw: "y = sum(x)", variableName: "y" } },
    ];
    const r1 = await solveDocument(blocks, "v1", []);
    const r2 = await solveDocument(blocks, "b1", r1.resolvedMap);
    const res = r2.results.find((r) => r.blockId === "b1");
    expect(hasUnits(res)).toBe(true);
  });

  it("sum([25,30,35] kN) → preserves complex scaled unit", async () => {
    const blocks: OrderedBlock[] = [
      { id: "v1", order: 1, type: "EQUATION", definition: { raw: "x = [25, 30, 35] kN", variableName: "x" } },
      { id: "b1", order: 2, type: "EQUATION", definition: { raw: "y = sum(x)", variableName: "y" } },
    ];
    const r1 = await solveDocument(blocks, "v1", []);
    const r2 = await solveDocument(blocks, "b1", r1.resolvedMap);
    const res = r2.results.find((r) => r.blockId === "b1");
    expect(hasUnits(res)).toBe(true);
  });
});

// ─── stdev ──────────────────────────────────────────────────────────────────

describe("stdev — unit preservation", () => {
  it("stdev([3,5,7] m) → preserves meter dimension", async () => {
    const res = await solveVec("y = stdev(x)", "y");
    expect(hasUnits(res)).toBe(true);
  });

  it("stdev with combined units vector", async () => {
    const blocks: OrderedBlock[] = [
      { id: "v1", order: 1, type: "EQUATION", definition: { raw: "x = [3, 5, 7] kg*m/s^2", variableName: "x" } },
      { id: "b1", order: 2, type: "EQUATION", definition: { raw: "y = stdev(x)", variableName: "y" } },
    ];
    const r1 = await solveDocument(blocks, "v1", []);
    const r2 = await solveDocument(blocks, "b1", r1.resolvedMap);
    const res = r2.results.find((r) => r.blockId === "b1");
    expect(hasUnits(res)).toBe(true);
  });

  it("stdev([3,5,7] km) → preserves scaled unit", async () => {
    const blocks: OrderedBlock[] = [
      { id: "v1", order: 1, type: "EQUATION", definition: { raw: "x = [3, 5, 7] km", variableName: "x" } },
      { id: "b1", order: 2, type: "EQUATION", definition: { raw: "y = stdev(x)", variableName: "y" } },
    ];
    const r1 = await solveDocument(blocks, "v1", []);
    const r2 = await solveDocument(blocks, "b1", r1.resolvedMap);
    const res = r2.results.find((r) => r.blockId === "b1");
    expect(hasUnits(res)).toBe(true);
  });

  it("stdev([25,30,35] kN) → preserves complex scaled unit", async () => {
    const blocks: OrderedBlock[] = [
      { id: "v1", order: 1, type: "EQUATION", definition: { raw: "x = [25, 30, 35] kN", variableName: "x" } },
      { id: "b1", order: 2, type: "EQUATION", definition: { raw: "y = stdev(x)", variableName: "y" } },
    ];
    const r1 = await solveDocument(blocks, "v1", []);
    const r2 = await solveDocument(blocks, "b1", r1.resolvedMap);
    const res = r2.results.find((r) => r.blockId === "b1");
    expect(hasUnits(res)).toBe(true);
  });
});

// ─── range ──────────────────────────────────────────────────────────────────

describe("range — unit preservation", () => {
  it("range([3,5,7] m) → preserves meter dimension", async () => {
    const res = await solveVec("y = range(x)", "y");
    expect(hasUnits(res)).toBe(true);
  });

  it("range with combined units vector", async () => {
    const blocks: OrderedBlock[] = [
      { id: "v1", order: 1, type: "EQUATION", definition: { raw: "x = [3, 5, 7] kg*m/s^2", variableName: "x" } },
      { id: "b1", order: 2, type: "EQUATION", definition: { raw: "y = range(x)", variableName: "y" } },
    ];
    const r1 = await solveDocument(blocks, "v1", []);
    const r2 = await solveDocument(blocks, "b1", r1.resolvedMap);
    const res = r2.results.find((r) => r.blockId === "b1");
    expect(hasUnits(res)).toBe(true);
  });

  it("range([3,5,7] km) → preserves scaled unit", async () => {
    const blocks: OrderedBlock[] = [
      { id: "v1", order: 1, type: "EQUATION", definition: { raw: "x = [3, 5, 7] km", variableName: "x" } },
      { id: "b1", order: 2, type: "EQUATION", definition: { raw: "y = range(x)", variableName: "y" } },
    ];
    const r1 = await solveDocument(blocks, "v1", []);
    const r2 = await solveDocument(blocks, "b1", r1.resolvedMap);
    const res = r2.results.find((r) => r.blockId === "b1");
    expect(hasUnits(res)).toBe(true);
  });

  it("range([25,30,35] kN) → preserves complex scaled unit", async () => {
    const blocks: OrderedBlock[] = [
      { id: "v1", order: 1, type: "EQUATION", definition: { raw: "x = [25, 30, 35] kN", variableName: "x" } },
      { id: "b1", order: 2, type: "EQUATION", definition: { raw: "y = range(x)", variableName: "y" } },
    ];
    const r1 = await solveDocument(blocks, "v1", []);
    const r2 = await solveDocument(blocks, "b1", r1.resolvedMap);
    const res = r2.results.find((r) => r.blockId === "b1");
    expect(hasUnits(res)).toBe(true);
  });
});

// ─── cumsum ─────────────────────────────────────────────────────────────────

describe("cumsum — unit preservation", () => {
  it("cumsum([3,5,7] m) → preserves meter dimension", async () => {
    const res = await solveVec("y = cumsum(x)", "y");
    expect(hasUnits(res)).toBe(true);
  });

  it("cumsum with combined units vector", async () => {
    const blocks: OrderedBlock[] = [
      { id: "v1", order: 1, type: "EQUATION", definition: { raw: "x = [3, 5, 7] kg*m/s^2", variableName: "x" } },
      { id: "b1", order: 2, type: "EQUATION", definition: { raw: "y = cumsum(x)", variableName: "y" } },
    ];
    const r1 = await solveDocument(blocks, "v1", []);
    const r2 = await solveDocument(blocks, "b1", r1.resolvedMap);
    const res = r2.results.find((r) => r.blockId === "b1");
    expect(hasUnits(res)).toBe(true);
  });

  it("cumsum([3,5,7] km) → preserves scaled unit", async () => {
    const blocks: OrderedBlock[] = [
      { id: "v1", order: 1, type: "EQUATION", definition: { raw: "x = [3, 5, 7] km", variableName: "x" } },
      { id: "b1", order: 2, type: "EQUATION", definition: { raw: "y = cumsum(x)", variableName: "y" } },
    ];
    const r1 = await solveDocument(blocks, "v1", []);
    const r2 = await solveDocument(blocks, "b1", r1.resolvedMap);
    const res = r2.results.find((r) => r.blockId === "b1");
    expect(hasUnits(res)).toBe(true);
  });

  it("cumsum([25,30,35] kN) → preserves complex scaled unit", async () => {
    const blocks: OrderedBlock[] = [
      { id: "v1", order: 1, type: "EQUATION", definition: { raw: "x = [25, 30, 35] kN", variableName: "x" } },
      { id: "b1", order: 2, type: "EQUATION", definition: { raw: "y = cumsum(x)", variableName: "y" } },
    ];
    const r1 = await solveDocument(blocks, "v1", []);
    const r2 = await solveDocument(blocks, "b1", r1.resolvedMap);
    const res = r2.results.find((r) => r.blockId === "b1");
    expect(hasUnits(res)).toBe(true);
  });
});

// ─── sort ───────────────────────────────────────────────────────────────────

describe("sort — unit preservation", () => {
  it("sort([3,5,7] m) → preserves meter dimension", async () => {
    const res = await solveVec("y = sort(x)", "y");
    expect(hasUnits(res)).toBe(true);
  });

  it("sort with combined units vector", async () => {
    const blocks: OrderedBlock[] = [
      { id: "v1", order: 1, type: "EQUATION", definition: { raw: "x = [7, 3, 5] kg*m/s^2", variableName: "x" } },
      { id: "b1", order: 2, type: "EQUATION", definition: { raw: "y = sort(x)", variableName: "y" } },
    ];
    const r1 = await solveDocument(blocks, "v1", []);
    const r2 = await solveDocument(blocks, "b1", r1.resolvedMap);
    const res = r2.results.find((r) => r.blockId === "b1");
    expect(hasUnits(res)).toBe(true);
  });

  it("sort([7,3,5] km) → preserves scaled unit", async () => {
    const blocks: OrderedBlock[] = [
      { id: "v1", order: 1, type: "EQUATION", definition: { raw: "x = [7, 3, 5] km", variableName: "x" } },
      { id: "b1", order: 2, type: "EQUATION", definition: { raw: "y = sort(x)", variableName: "y" } },
    ];
    const r1 = await solveDocument(blocks, "v1", []);
    const r2 = await solveDocument(blocks, "b1", r1.resolvedMap);
    const res = r2.results.find((r) => r.blockId === "b1");
    expect(hasUnits(res)).toBe(true);
  });

  it("sort([35,25,30] kN) → preserves complex scaled unit", async () => {
    const blocks: OrderedBlock[] = [
      { id: "v1", order: 1, type: "EQUATION", definition: { raw: "x = [35, 25, 30] kN", variableName: "x" } },
      { id: "b1", order: 2, type: "EQUATION", definition: { raw: "y = sort(x)", variableName: "y" } },
    ];
    const r1 = await solveDocument(blocks, "v1", []);
    const r2 = await solveDocument(blocks, "b1", r1.resolvedMap);
    const res = r2.results.find((r) => r.blockId === "b1");
    expect(hasUnits(res)).toBe(true);
  });
});

// ─── percentile ─────────────────────────────────────────────────────────────

describe("percentile — unit preservation", () => {
  it("percentile([3,5,7] m, 50) → preserves meter dimension", async () => {
    const blocks: OrderedBlock[] = [
      { id: "v1", order: 1, type: "EQUATION", definition: { raw: "x = [3, 5, 7] m", variableName: "x" } },
      { id: "b1", order: 2, type: "EQUATION", definition: { raw: "y = percentile(x, 50)", variableName: "y" } },
    ];
    const r1 = await solveDocument(blocks, "v1", []);
    const r2 = await solveDocument(blocks, "b1", r1.resolvedMap);
    const res = r2.results.find((r) => r.blockId === "b1");
    expect(hasUnits(res)).toBe(true);
  });

  it("percentile with combined units", async () => {
    const blocks: OrderedBlock[] = [
      { id: "v1", order: 1, type: "EQUATION", definition: { raw: "x = [3, 5, 7] kg*m/s^2", variableName: "x" } },
      { id: "b1", order: 2, type: "EQUATION", definition: { raw: "y = percentile(x, 50)", variableName: "y" } },
    ];
    const r1 = await solveDocument(blocks, "v1", []);
    const r2 = await solveDocument(blocks, "b1", r1.resolvedMap);
    const res = r2.results.find((r) => r.blockId === "b1");
    expect(hasUnits(res)).toBe(true);
  });

  it("percentile([3,5,7] km, 50) → preserves scaled unit", async () => {
    const blocks: OrderedBlock[] = [
      { id: "v1", order: 1, type: "EQUATION", definition: { raw: "x = [3, 5, 7] km", variableName: "x" } },
      { id: "b1", order: 2, type: "EQUATION", definition: { raw: "y = percentile(x, 50)", variableName: "y" } },
    ];
    const r1 = await solveDocument(blocks, "v1", []);
    const r2 = await solveDocument(blocks, "b1", r1.resolvedMap);
    const res = r2.results.find((r) => r.blockId === "b1");
    expect(hasUnits(res)).toBe(true);
  });

  it("percentile([25,30,35] kN, 75) → preserves complex scaled unit", async () => {
    const blocks: OrderedBlock[] = [
      { id: "v1", order: 1, type: "EQUATION", definition: { raw: "x = [25, 30, 35] kN", variableName: "x" } },
      { id: "b1", order: 2, type: "EQUATION", definition: { raw: "y = percentile(x, 75)", variableName: "y" } },
    ];
    const r1 = await solveDocument(blocks, "v1", []);
    const r2 = await solveDocument(blocks, "b1", r1.resolvedMap);
    const res = r2.results.find((r) => r.blockId === "b1");
    expect(hasUnits(res)).toBe(true);
  });
});

// ─── clip ───────────────────────────────────────────────────────────────────

describe("clip — unit preservation", () => {
  it("clip([3,5,7] m, 2, 6) → preserves meter dimension", async () => {
    const blocks: OrderedBlock[] = [
      { id: "v1", order: 1, type: "EQUATION", definition: { raw: "x = [3, 5, 7] m", variableName: "x" } },
      { id: "b1", order: 2, type: "EQUATION", definition: { raw: "y = clip(x, 2, 6)", variableName: "y" } },
    ];
    const r1 = await solveDocument(blocks, "v1", []);
    const r2 = await solveDocument(blocks, "b1", r1.resolvedMap);
    const res = r2.results.find((r) => r.blockId === "b1");
    expect(hasUnits(res)).toBe(true);
  });

  it("clip with combined units", async () => {
    const blocks: OrderedBlock[] = [
      { id: "v1", order: 1, type: "EQUATION", definition: { raw: "x = [3, 5, 7] kg*m/s^2", variableName: "x" } },
      { id: "b1", order: 2, type: "EQUATION", definition: { raw: "y = clip(x, 2, 6)", variableName: "y" } },
    ];
    const r1 = await solveDocument(blocks, "v1", []);
    const r2 = await solveDocument(blocks, "b1", r1.resolvedMap);
    const res = r2.results.find((r) => r.blockId === "b1");
    expect(hasUnits(res)).toBe(true);
  });

  it("clip([3,5,7] km, 2, 6) → preserves scaled unit", async () => {
    const blocks: OrderedBlock[] = [
      { id: "v1", order: 1, type: "EQUATION", definition: { raw: "x = [3, 5, 7] km", variableName: "x" } },
      { id: "b1", order: 2, type: "EQUATION", definition: { raw: "y = clip(x, 2, 6)", variableName: "y" } },
    ];
    const r1 = await solveDocument(blocks, "v1", []);
    const r2 = await solveDocument(blocks, "b1", r1.resolvedMap);
    const res = r2.results.find((r) => r.blockId === "b1");
    expect(hasUnits(res)).toBe(true);
  });

  it("clip([25,30,35] kN, 20, 32) → preserves complex scaled unit", async () => {
    const blocks: OrderedBlock[] = [
      { id: "v1", order: 1, type: "EQUATION", definition: { raw: "x = [25, 30, 35] kN", variableName: "x" } },
      { id: "b1", order: 2, type: "EQUATION", definition: { raw: "y = clip(x, 20, 32)", variableName: "y" } },
    ];
    const r1 = await solveDocument(blocks, "v1", []);
    const r2 = await solveDocument(blocks, "b1", r1.resolvedMap);
    const res = r2.results.find((r) => r.blockId === "b1");
    expect(hasUnits(res)).toBe(true);
  });
});

// ─── diff ───────────────────────────────────────────────────────────────────

describe("diff — unit preservation", () => {
  it("diff([3,5,7] m) → preserves meter dimension", async () => {
    const res = await solveVec("y = diff(x)", "y");
    expect(hasUnits(res)).toBe(true);
  });

  it("diff with combined units vector", async () => {
    const blocks: OrderedBlock[] = [
      { id: "v1", order: 1, type: "EQUATION", definition: { raw: "x = [3, 5, 7] kg*m/s^2", variableName: "x" } },
      { id: "b1", order: 2, type: "EQUATION", definition: { raw: "y = diff(x)", variableName: "y" } },
    ];
    const r1 = await solveDocument(blocks, "v1", []);
    const r2 = await solveDocument(blocks, "b1", r1.resolvedMap);
    const res = r2.results.find((r) => r.blockId === "b1");
    expect(hasUnits(res)).toBe(true);
  });

  it("diff([3,5,7] km) → preserves scaled unit", async () => {
    const blocks: OrderedBlock[] = [
      { id: "v1", order: 1, type: "EQUATION", definition: { raw: "x = [3, 5, 7] km", variableName: "x" } },
      { id: "b1", order: 2, type: "EQUATION", definition: { raw: "y = diff(x)", variableName: "y" } },
    ];
    const r1 = await solveDocument(blocks, "v1", []);
    const r2 = await solveDocument(blocks, "b1", r1.resolvedMap);
    const res = r2.results.find((r) => r.blockId === "b1");
    expect(hasUnits(res)).toBe(true);
  });

  it("diff([25,30,35] kN) → preserves complex scaled unit", async () => {
    const blocks: OrderedBlock[] = [
      { id: "v1", order: 1, type: "EQUATION", definition: { raw: "x = [25, 30, 35] kN", variableName: "x" } },
      { id: "b1", order: 2, type: "EQUATION", definition: { raw: "y = diff(x)", variableName: "y" } },
    ];
    const r1 = await solveDocument(blocks, "v1", []);
    const r2 = await solveDocument(blocks, "b1", r1.resolvedMap);
    const res = r2.results.find((r) => r.blockId === "b1");
    expect(hasUnits(res)).toBe(true);
  });
});
