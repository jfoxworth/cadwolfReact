/**
 * Tests for norm() — solver/functions/matrix/norm.ts
 *
 * Formula: p-norm — (Σ|xi|^p)^(1/p)
 *   args[0] = mat — matrix or vector
 *   args[1] = p   — norm order (default 2)
 *
 * Direct-call tests:
 *   - L2 norm of [3,4] → 5
 *   - L1 norm of [3,4] → 7
 *   - L2 norm of [1,0] → 1
 *   - L2 norm of [-3,-4] → 5 (absolute values)
 *
 * Pipeline tests:
 *   - norm([3,4], 2) → 5
 *   - norm([3,4], 1) → 7
 *
 * Unit tests:
 *   - norm() uses SI values
 *   - norm([3ft], 2) → 3*FT_M (single-element L2 norm)
 */

import { describe, it, expect } from "vitest";
import { norm } from "../../functions/matrix/norm";
import { runPipeline } from "../../pipeline";
import { ctx } from "../helpers";
import { solveDocument } from "../../worker/document-solver";
import type { OrderedBlock } from "../../types";

async function solveWith(varVal: string, varUnit: string, fnExpr: string) {
  const blocks: OrderedBlock[] = [
    { id: "vb", order: 1, type: "EQUATION", definition: { raw: `v = ${varVal}`, variableName: "v", unit: varUnit } },
    { id: "xb", order: 2, type: "EQUATION", definition: { raw: `x = ${fnExpr}`, variableName: "x", unit: "" } },
  ];
  const r1 = await solveDocument(blocks, "vb", []);
  const r2 = await solveDocument(blocks, "xb", r1.resolvedMap);
  return r2.results.find((r) => r.blockId === "xb")!;
}

const FT_M = 0.3048;

// ── Direct call tests ──────────────────────────────────────────────────────────

describe("norm — direct call: L2 norm", () => {
  it("[3,4] L2 → 5", async () => {
    const mat = { "0-0": 3, "0-1": 4 };
    const p   = { "0-0": 2 };
    const r = await norm([mat, p], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(5, 10);
  });

  it("[1,0] L2 → 1", async () => {
    const r = await norm([{ "0-0": 1, "0-1": 0 }, { "0-0": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(1, 10);
  });

  it("[-3,-4] L2 → 5 (absolute values)", async () => {
    const r = await norm([{ "0-0": -3, "0-1": -4 }, { "0-0": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(5, 10);
  });

  it("scalar [5] L2 → 5", async () => {
    const r = await norm([{ "0-0": 5 }, { "0-0": 2 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(5, 10);
  });
});

describe("norm — direct call: L1 norm", () => {
  it("[3,4] L1 → 7", async () => {
    const mat = { "0-0": 3, "0-1": 4 };
    const p   = { "0-0": 1 };
    const r = await norm([mat, p], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(7, 10);
  });

  it("[-2,3,-1] L1 → 6", async () => {
    const r = await norm([{ "0-0": -2, "0-1": 3, "0-2": -1 }, { "0-0": 1 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(6, 10);
  });
});

describe("norm — direct call: default p=2", () => {
  it("[3,4] with no p → L2 = 5", async () => {
    const r = await norm([{ "0-0": 3, "0-1": 4 }], ctx("x=0"));
    expect(r["0-0"]).toBeCloseTo(5, 10);
  });
});

// ── Pipeline tests ─────────────────────────────────────────────────────────────

describe("norm — pipeline", () => {
  it("norm([3,4], 2) → 5", async () => {
    const r = await runPipeline(ctx("x = norm([3,4], 2)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(5, 4);
  });

  it("norm([3,4], 1) → 7", async () => {
    const r = await runPipeline(ctx("x = norm([3,4], 1)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(7, 4);
  });

  it("norm(5, 2) → 5", async () => {
    const r = await runPipeline(ctx("x = norm(5, 2)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(5, 4);
  });
});

// ── Unit tests ─────────────────────────────────────────────────────────────────

describe("norm — unit tests: SI values used", () => {
  it("norm([3ft], 2) → 3*FT_M (single-element L2 norm)", async () => {
    const r = await runPipeline(ctx("x = norm([3ft], 2)"));
    expect(r.errors).toHaveLength(0);
    expect(r.solution.real["0-0"]).toBeCloseTo(3 * FT_M, 4);
  });

  it("v = 3 ft → norm([v], 2) ≈ 3*FT_M", async () => {
    const r = await solveWith("3", "ft", "norm([v], 2)");
    expect(r.errors).toHaveLength(0);
    expect(r.solution?.real["0-0"]).toBeCloseTo(3 * FT_M, 4);
  });
});
