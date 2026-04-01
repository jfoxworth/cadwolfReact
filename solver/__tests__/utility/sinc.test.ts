import { describe, it, expect } from "vitest";
import { sinc } from "../../functions/utility/sinc";
import { runPipeline } from "../../pipeline";
import { ctx } from "../helpers";

describe("sinc — direct call", () => {
  it("sinc(0) = 1 (by L'Hopital / definition)", async () => {
    expect((await sinc([{ "0-0": 0 }], ctx("x=0")))["0-0"]).toBeCloseTo(1, 10);
  });
  it("sinc(1) = sin(π)/π = 0", async () => {
    expect((await sinc([{ "0-0": 1 }], ctx("x=0")))["0-0"]).toBeCloseTo(0, 8);
  });
  it("sinc(-1) = 0 (even function)", async () => {
    expect((await sinc([{ "0-0": -1 }], ctx("x=0")))["0-0"]).toBeCloseTo(0, 8);
  });
  it("sinc(0.5) = sin(π/2)/(π/2) = 2/π", async () => {
    expect((await sinc([{ "0-0": 0.5 }], ctx("x=0")))["0-0"]).toBeCloseTo(2 / Math.PI, 8);
  });
  it("sinc(2) = 0", async () => {
    expect((await sinc([{ "0-0": 2 }], ctx("x=0")))["0-0"]).toBeCloseTo(0, 8);
  });
  it("sinc(0.25) = sin(π/4)/(π/4) = 2√2/π", async () => {
    expect((await sinc([{ "0-0": 0.25 }], ctx("x=0")))["0-0"]).toBeCloseTo(
      Math.sin(Math.PI * 0.25) / (Math.PI * 0.25), 8
    );
  });
  it("even function: sinc(x) = sinc(-x)", async () => {
    const p = (await sinc([{ "0-0": 0.7 }], ctx("x=0")))["0-0"];
    const n = (await sinc([{ "0-0": -0.7 }], ctx("x=0")))["0-0"];
    expect(p).toBeCloseTo(n, 10);
  });
  it("row vector element-wise", async () => {
    const r = await sinc([{ "0-0": 0, "0-1": 1, "0-2": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 8);
    expect(r["0-1"]).toBeCloseTo(0, 8);
    expect(r["0-2"]).toBeCloseTo(0, 8);
  });
});

describe("sinc — pipeline", () => {
  it("x = sinc(0) → 1", async () => {
    const r = await runPipeline(ctx("x = sinc(0)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
  });
});
