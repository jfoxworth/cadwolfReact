/**
 * When a matrix is too large to print (> 10 elements) the display shows only its size,
 * e.g. [12x1]. Any units must follow the size: [12x1] m.
 */
import { describe, it, expect } from "vitest";
import { solveDocument } from "../../worker/document-solver";
import type { OrderedBlock } from "../../types";

async function solveLast(name: string, raw: string): Promise<any> {
  const blocks: OrderedBlock[] = [{
    id: "b0", order: 1, type: "EQUATION",
    definition: { raw: `${name} = ${raw}`, variableName: name, unit: "" },
  }];
  const r = await solveDocument(blocks, "b0", []);
  return (r.results as any[]).find((x) => x.blockId === "b0");
}

const BIG = "[1m;2m;3m;4m;5m;6m;7m;8m;9m;10m;11m;12m]";

describe("size-only matrix display carries units", () => {
  it("12x1 in metres → [12x1] followed by m", async () => {
    const r = { x: await solveLast("x", BIG) };
    expect(r.x?.display?.solution).toMatch(/^\\text\{\[12x1\]\} \\, /);
    expect(r.x?.display?.solution).toContain("m");
    expect(r.x?.display?.matrixUnits).toContain("m");
  });

  it("unitless 12x1 shows just the size", async () => {
    const r = { x: await solveLast("x", "[1;2;3;4;5;6;7;8;9;10;11;12]") };
    expect(r.x?.display?.solution).toBe("\\text{[12x1]}");
    expect(r.x?.display?.matrixUnits).toBe("");
  });
});
