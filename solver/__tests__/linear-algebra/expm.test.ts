import { describe, it, expect } from "vitest";
import { expm } from "../../functions/linear-algebra/expm";

describe("expm", () => {
  it("expm of zero matrix = identity", async () => {
    const Z = { "0-0": 0, "0-1": 0, "1-0": 0, "1-1": 0 };
    const r = await expm([Z], {} as any);
    expect(r["0-0"]).toBeCloseTo(1, 8);
    expect(r["0-1"]).toBeCloseTo(0, 8);
    expect(r["1-0"]).toBeCloseTo(0, 8);
    expect(r["1-1"]).toBeCloseTo(1, 8);
  });

  it("expm of 1×1 scalar [a] = e^a", async () => {
    const A = { "0-0": 2 };
    const r = await expm([A], {} as any);
    expect(r["0-0"]).toBeCloseTo(Math.E * Math.E, 6);
  });

  it("expm of diagonal matrix = diagonal of e^d", async () => {
    const D = { "0-0": 1, "0-1": 0, "1-0": 0, "1-1": 2 };
    const r = await expm([D], {} as any);
    expect(r["0-0"]).toBeCloseTo(Math.E, 6);
    expect(r["0-1"]).toBeCloseTo(0, 8);
    expect(r["1-0"]).toBeCloseTo(0, 8);
    expect(r["1-1"]).toBeCloseTo(Math.E * Math.E, 6);
  });

  it("expm of skew-symmetric matrix is rotation matrix", async () => {
    // A = [[0,-t],[t,0]] → expm(A) = [[cos t, -sin t],[sin t, cos t]]
    const t = Math.PI / 4;
    const A = { "0-0": 0, "0-1": -t, "1-0": t, "1-1": 0 };
    const r = await expm([A], {} as any);
    expect(r["0-0"]).toBeCloseTo(Math.cos(t), 6);
    expect(r["0-1"]).toBeCloseTo(-Math.sin(t), 6);
    expect(r["1-0"]).toBeCloseTo(Math.sin(t), 6);
    expect(r["1-1"]).toBeCloseTo(Math.cos(t), 6);
  });

  it("expm(A) * expm(-A) = I", async () => {
    const A = { "0-0": 1, "0-1": 2, "1-0": 0, "1-1": 3 };
    const negA = { "0-0": -1, "0-1": -2, "1-0": 0, "1-1": -3 };
    const eA = await expm([A], {} as any);
    const eNegA = await expm([negA], {} as any);
    // eA * eNegA should be ~I
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        let s = 0;
        for (let k = 0; k < 2; k++) s += (eA[`${i}-${k}`] ?? 0) * (eNegA[`${k}-${j}`] ?? 0);
        expect(s).toBeCloseTo(i === j ? 1 : 0, 6);
      }
    }
  });
});
