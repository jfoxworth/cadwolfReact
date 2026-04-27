import { describe, it, expect } from "vitest";
import { solveDocument } from "../../worker/document-solver";
import type { OrderedBlock, ResolvedEquation } from "../../types";

const blocks3: OrderedBlock[] = [
  {
    id: "len", order: 1, type: "EQUATION",
    definition: { raw: "totalLength = 100", variableName: "totalLength", unit: "m" },
  },
  {
    id: "nodes", order: 2, type: "EQUATION",
    definition: { raw: "nodes = [0, 0; totalLength, 0]", variableName: "nodes", unit: "" },
  },
  {
    id: "L1", order: 3, type: "EQUATION",
    definition: { raw: "L_1 = nodes[1,0]", variableName: "L_1", unit: "" },
  },
];

const blocks3b: OrderedBlock[] = [
  {
    id: "len", order: 1, type: "EQUATION",
    definition: { raw: "totalLength = 100", variableName: "totalLength", unit: "m" },
  },
  {
    id: "nodes", order: 2, type: "EQUATION",
    definition: { raw: "nodes = [0, 0; totalLength, 0]", variableName: "nodes", unit: "" },
  },
  {
    id: "delta", order: 3, type: "EQUATION",
    definition: { raw: "delta = nodes[1,0] - nodes[0,0]", variableName: "delta", unit: "" },
  },
];

describe("unit propagation through matrix indexing", () => {
  it("nodes[1,0] preserves meters from the parent matrix", async () => {
    const r1 = await solveDocument(blocks3, "len", []);
    const r2 = await solveDocument(blocks3, "nodes", r1.resolvedMap);
    const r3 = await solveDocument(blocks3, "L1", r2.resolvedMap);
    const L1 = r3.results.find((r) => r.blockId === "L1")!;

    expect(L1.errors).toHaveLength(0);
    expect(L1.solution?.real["0-0"]).toBeCloseTo(100, 4);
    expect(L1.solution?.baseUnits[3]).toBe(1); // m^1
    expect(L1.solution?.units).toBe("m");
  });

  it("nodes[1,0] - nodes[0,0] subtracts with units preserved", async () => {
    const r1 = await solveDocument(blocks3b, "len", []);
    const r2 = await solveDocument(blocks3b, "nodes", r1.resolvedMap);
    const r3 = await solveDocument(blocks3b, "delta", r2.resolvedMap);
    const delta = r3.results.find((r) => r.blockId === "delta")!;

    expect(delta.errors).toHaveLength(0);
    expect(delta.solution?.real["0-0"]).toBeCloseTo(100, 4);
    expect(delta.solution?.baseUnits[3]).toBe(1); // m^1
  });
});
