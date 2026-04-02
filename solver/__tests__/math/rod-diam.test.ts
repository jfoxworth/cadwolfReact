import { describe, it, expect } from "vitest";
import { runPipeline } from "../../pipeline";
import { ctx } from "../helpers";

describe("RodOuterDiam equation patterns", () => {
  it("inner: dimensioned value + power(2, dimensioned)", async () => {
    const r = await runPipeline(ctx(
      "x = 7.53e-5 m^2 + power(2, 0.0254 m)"
    ));
    console.log("inner errors:", r.errors);
    console.log("inner baseUnits:", r.solution.baseUnits);
  });

  it("full pattern: 2*root(2, m2_val + power(2, m_val)) + literal_in", async () => {
    const r = await runPipeline(ctx(
      "x = 2*root(2, 7.53e-5 m^2 + power(2, 0.0254 m)) + 0.125 in"
    ));
    console.log("full errors:", r.errors);
    console.log("full value:", r.solution.real["0-0"]);
    console.log("full units:", r.solution.units);
  });
});
