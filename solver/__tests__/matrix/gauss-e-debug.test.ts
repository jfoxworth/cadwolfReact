import { describe, it } from "vitest";
import { runPipeline } from "../../pipeline";
import { ctx } from "../helpers";
import type { SolveContext } from "../../types";

const emptyBase: [number,number,number,number,number,number,number,number] = [0,0,0,0,0,0,0,0];

describe("gaussE debug", () => {
  it("prints error", async () => {
    const A = { "0-0":1,"0-1":2,"1-0":3,"1-1":4 };
    const b = { "0-0":5,"1-0":6 };
    const c: SolveContext = {
      ...ctx("x = gaussE(A, b)"),
      documentEquations: [
        { blockId: "A", order: 0, variableName: "A", solution: { real: A, imag: {}, size: "2x2", units: "", baseUnits: emptyBase, multiplier: 1 }, error: null },
        { blockId: "b", order: 1, variableName: "b", solution: { real: b, imag: {}, size: "2x1", units: "", baseUnits: emptyBase, multiplier: 1 }, error: null },
      ],
      currentBlockOrder: 2,
    };
    const r = await runPipeline(c);
    console.log("ERRORS:", r.errors);
    console.log("SOLUTION:", r.solution);
  });
});
