import { describe, it, expect } from "vitest";
import { runPipeline } from "../../pipeline";
import { ctx } from "../helpers";

describe("sin", () => {
  it("sin(0) = 0", async () => {
    const r = await runPipeline(ctx("x = sin(0)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });

  it("sin(0.5) ≈ 0.4794", async () => {
    const r = await runPipeline(ctx("x = sin(0.5)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(0.4794, 4);
  });

  it("sin(1) ≈ 0.8415", async () => {
    const r = await runPipeline(ctx("x = sin(1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(0.8415, 4);
  });

  it("sin(0deg) = 0", async () => {
    const r = await runPipeline(ctx("x = sin(0deg)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });

  it("sin(30deg) = 0.5", async () => {
    const r = await runPipeline(ctx("x = sin(30deg)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(0.5, 4);
  });

  it("sin(45deg) ≈ 0.7071", async () => {
    const r = await runPipeline(ctx("x = sin(45deg)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(0.7071, 4);
  });

  it("sin(90deg) = 1", async () => {
    const r = await runPipeline(ctx("x = sin(90deg)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
  });

  it("sin(180deg) ≈ 0", async () => {
    const r = await runPipeline(ctx("x = sin(180deg)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });
});

describe("cos", () => {
  it("cos(0) = 1", async () => {
    const r = await runPipeline(ctx("x = cos(0)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
  });

  it("cos(1) ≈ 0.5403", async () => {
    const r = await runPipeline(ctx("x = cos(1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(0.5403, 4);
  });

  it("cos(0deg) = 1", async () => {
    const r = await runPipeline(ctx("x = cos(0deg)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
  });

  it("cos(60deg) = 0.5", async () => {
    const r = await runPipeline(ctx("x = cos(60deg)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(0.5, 4);
  });

  it("cos(90deg) ≈ 0", async () => {
    const r = await runPipeline(ctx("x = cos(90deg)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });

  it("cos(180deg) = -1", async () => {
    const r = await runPipeline(ctx("x = cos(180deg)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(-1, 4);
  });
});

describe("tan", () => {
  it("tan(0) = 0", async () => {
    const r = await runPipeline(ctx("x = tan(0)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });

  it("tan(1) ≈ 1.5574", async () => {
    const r = await runPipeline(ctx("x = tan(1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(1.5574, 4);
  });

  it("tan(0deg) = 0", async () => {
    const r = await runPipeline(ctx("x = tan(0deg)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });

  it("tan(45deg) ≈ 1", async () => {
    const r = await runPipeline(ctx("x = tan(45deg)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
  });
});

describe("asin", () => {
  it("asin(0) = 0", async () => {
    const r = await runPipeline(ctx("x = asin(0)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });

  it("asin(0.5) ≈ π/6", async () => {
    const r = await runPipeline(ctx("x = asin(0.5)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.PI / 6, 4);
  });

  it("asin(1) ≈ π/2", async () => {
    const r = await runPipeline(ctx("x = asin(1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.PI / 2, 4);
  });
});

describe("acos", () => {
  it("acos(1) = 0", async () => {
    const r = await runPipeline(ctx("x = acos(1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });

  it("acos(0.5) ≈ π/3", async () => {
    const r = await runPipeline(ctx("x = acos(0.5)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.PI / 3, 4);
  });

  it("acos(0) ≈ π/2", async () => {
    const r = await runPipeline(ctx("x = acos(0)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.PI / 2, 4);
  });
});

describe("atan", () => {
  it("atan(0) = 0", async () => {
    const r = await runPipeline(ctx("x = atan(0)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });

  it("atan(1) ≈ π/4", async () => {
    const r = await runPipeline(ctx("x = atan(1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(Math.PI / 4, 4);
  });

  it("atan(-1) ≈ -π/4", async () => {
    const r = await runPipeline(ctx("x = atan(-1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(-Math.PI / 4, 4);
  });
});

describe("sinh", () => {
  it("sinh(0) = 0", async () => {
    const r = await runPipeline(ctx("x = sinh(0)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });

  it("sinh(1) ≈ 1.1752", async () => {
    const r = await runPipeline(ctx("x = sinh(1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(1.1752, 4);
  });
});

describe("cosh", () => {
  it("cosh(0) = 1", async () => {
    const r = await runPipeline(ctx("x = cosh(0)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
  });

  it("cosh(1) ≈ 1.5431", async () => {
    const r = await runPipeline(ctx("x = cosh(1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(1.5431, 4);
  });
});

describe("tanh", () => {
  it("tanh(0) = 0", async () => {
    const r = await runPipeline(ctx("x = tanh(0)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });

  it("tanh(1) ≈ 0.7616", async () => {
    const r = await runPipeline(ctx("x = tanh(1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(0.7616, 4);
  });
});

describe("sec", () => {
  it("sec(0) = 1", async () => {
    const r = await runPipeline(ctx("x = sec(0)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
  });

  it("sec(60deg) = 2", async () => {
    const r = await runPipeline(ctx("x = sec(60deg)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(2, 4);
  });
});

describe("csc", () => {
  it("csc(90deg) = 1", async () => {
    const r = await runPipeline(ctx("x = csc(90deg)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
  });

  it("csc(30deg) = 2", async () => {
    const r = await runPipeline(ctx("x = csc(30deg)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(2, 4);
  });
});

describe("cot", () => {
  it("cot(45deg) ≈ 1", async () => {
    const r = await runPipeline(ctx("x = cot(45deg)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(1, 4);
  });

  it("cot(90deg) ≈ 0", async () => {
    const r = await runPipeline(ctx("x = cot(90deg)"));
    expect(r.errors).toHaveLength(0);
    expect(r.variableName).toBe("x");
    expect(r.solution.real["0-0"]).toBeCloseTo(0, 4);
  });
});

// ─── Vector tests ─────────────────────────────────────────────────────────────
// These are the critical tests. Scalar-only tests passed even when functions
// were broken for vectors. Every function MUST be tested with a vector input.

import type { ResolvedEquation } from "../../types";

const emptyBase: [number,number,number,number,number,number,number,number] = [0,0,0,0,0,0,0,0];

function vector(name: string, vals: number[], order: number): ResolvedEquation {
  const real: Record<string, number> = {};
  vals.forEach((v, i) => { real[`0-${i}`] = v; });
  return {
    blockId: name, order, variableName: name,
    solution: { real, imag: {}, size: `1x${vals.length}`, units: "", baseUnits: emptyBase, multiplier: 1 },
    error: null,
  };
}

const X_VALS = [0, Math.PI / 6, Math.PI / 4, Math.PI / 3, Math.PI / 2];

describe("sin — vector input", () => {
  it("sin(x) element-wise over a vector", async () => {
    const c = ctx("y = sin(x)");
    c.documentEquations = [vector("x", X_VALS, -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(Object.keys(r.solution.real)).toHaveLength(X_VALS.length);
    X_VALS.forEach((v, i) => {
      expect(r.solution.real[`0-${i}`]).toBeCloseTo(Math.sin(v), 4);
    });
  });

  it("sin(10*x) where x is a vector — the original failing case", async () => {
    const xVals = Array.from({ length: 5 }, (_, i) => i * 0.025);
    const c = ctx("y = sin(10*x)");
    c.documentEquations = [vector("x", xVals, -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(Object.keys(r.solution.real)).toHaveLength(xVals.length);
    // x[0]=0 so sin(0)=0, but x[1]=0.025 so sin(0.25)≠0
    expect(r.solution.real["0-1"]).toBeCloseTo(Math.sin(0.25), 4);
    expect(r.solution.real["0-2"]).toBeCloseTo(Math.sin(0.5), 4);
  });
});

describe("cos — vector input", () => {
  it("cos(x) element-wise over a vector", async () => {
    const c = ctx("y = cos(x)");
    c.documentEquations = [vector("x", X_VALS, -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(Object.keys(r.solution.real)).toHaveLength(X_VALS.length);
    X_VALS.forEach((v, i) => {
      expect(r.solution.real[`0-${i}`]).toBeCloseTo(Math.cos(v), 4);
    });
  });
});

describe("tan — vector input", () => {
  it("tan(x) element-wise over a vector", async () => {
    const vals = [0, 0.5, 1.0];
    const c = ctx("y = tan(x)");
    c.documentEquations = [vector("x", vals, -1)];
    c.currentBlockOrder = 0;
    const r = await runPipeline(c);
    expect(r.errors).toHaveLength(0);
    expect(Object.keys(r.solution.real)).toHaveLength(vals.length);
    vals.forEach((v, i) => {
      expect(r.solution.real[`0-${i}`]).toBeCloseTo(Math.tan(v), 4);
    });
  });
});
