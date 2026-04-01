import { describe, it, expect } from "vitest";
import { runPipeline } from "../../pipeline";
import { ctx } from "../helpers";
import type { ResolvedEquation } from "../../types";

const emptyBase: [number,number,number,number,number,number,number,number] = [0,0,0,0,0,0,0,0];

function scalar(name: string, val: number, order: number): ResolvedEquation {
  return {
    blockId: name, order, variableName: name,
    solution: { real: { "0-0": val }, imag: { "0-0": 0 }, size: "1x1", units: "", baseUnits: emptyBase, multiplier: 1 },
    error: null,
  };
}

function vector(name: string, vals: number[], order: number): ResolvedEquation {
  const real: Record<string, number> = {};
  vals.forEach((v, i) => { real[`0-${i}`] = v; });
  return {
    blockId: name, order, variableName: name,
    solution: { real, imag: {}, size: `1x${vals.length}`, units: "", baseUnits: emptyBase, multiplier: 1 },
    error: null,
  };
}

describe("tanh with vector argument via variable substitution", () => {
  it("tanh(t) where t=[0,1,2] returns element-wise tanh", async () => {
    const c = ctx("y = tanh(t)");
    c.documentEquations = [ vector("t", [0, 1, 2], -1) ];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(Object.keys(r.solution.real).length).toBeGreaterThan(1);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.tanh(0), 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(Math.tanh(1), 4);
    expect(r.solution.real["0-2"]).toBeCloseTo(Math.tanh(2), 4);
  });

  it("tanh(k*t) where k=0.5, t=[0,1,2] returns element-wise tanh", async () => {
    const c = ctx("y = tanh(k*t)");
    c.documentEquations = [
      scalar("k", 0.5, -2),
      vector("t", [0, 1, 2], -1),
    ];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(Object.keys(r.solution.real).length).toBeGreaterThan(1);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.tanh(0), 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(Math.tanh(0.5), 4);
    expect(r.solution.real["0-2"]).toBeCloseTo(Math.tanh(1), 4);
  });

  it("tanh(root(2,a)*t) where a=16, t=[0,1,2]", async () => {
    const c = ctx("y = tanh(root(2,a)*t)");
    c.documentEquations = [
      scalar("a", 16, -2),
      vector("t", [0, 1, 2], -1),
    ];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    // root(2, 16) = sqrt(16) = 4
    // tanh(4*t) at t=0,1,2
    expect(r.errors).toHaveLength(0);
    expect(Object.keys(r.solution.real).length).toBeGreaterThan(1);
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.tanh(0), 4);
    expect(r.solution.real["0-1"]).toBeCloseTo(Math.tanh(4 * 1), 4);
    expect(r.solution.real["0-2"]).toBeCloseTo(Math.tanh(4 * 2), 4);
  });

  it("full terminal velocity formula — root(n, value) convention", async () => {
    const grav = 9.81;
    const mass = 70;
    const Cd = 0.47;
    const timeVals = [0, 1, 2, 3, 4, 5];
    const c = ctx("Velocity1 = root(2,grav*mass/Cd)*tanh(root(2,(grav*Cd)/mass)*time)");
    c.documentEquations = [
      scalar("grav", grav, -4),
      scalar("mass", mass, -3),
      scalar("Cd", Cd, -2),
      vector("time", timeVals, -1),
    ];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    // root(2, X) = sqrt(X) with corrected convention
    const vt = Math.sqrt(grav * mass / Cd);          // terminal velocity
    const k  = Math.sqrt((grav * Cd) / mass);         // time constant
    expect(r.errors).toHaveLength(0);
    expect(Object.keys(r.solution.real).length).toBe(6);
    timeVals.forEach((t, i) => {
      const expected = vt * Math.tanh(k * t);
      expect(r.solution.real[`0-${i}`]).toBeCloseTo(expected, 4);
    });
  });
});
