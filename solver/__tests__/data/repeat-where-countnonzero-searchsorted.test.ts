import { describe, it, expect } from "vitest";
import { repeatElem }   from "../../functions/data/repeat-elem";
import { where }        from "../../functions/data/where";
import { countNonzero } from "../../functions/data/count-nonzero";
import { searchsorted } from "../../functions/data/searchsorted";

describe("repeatElem", () => {
  it("repeat each element 2 times", async () => {
    const x = { "0-0": 1, "0-1": 2, "0-2": 3 };
    const n = { "0-0": 2 };
    const r = await repeatElem([x, n], {} as any);
    expect(r["0-0"]).toBe(1);
    expect(r["0-1"]).toBe(1);
    expect(r["0-2"]).toBe(2);
    expect(r["0-3"]).toBe(2);
    expect(r["0-4"]).toBe(3);
    expect(r["0-5"]).toBe(3);
  });

  it("repeat 1 time is identity", async () => {
    const x = { "0-0": 7, "0-1": 8 };
    const r = await repeatElem([x, { "0-0": 1 }], {} as any);
    expect(r["0-0"]).toBe(7);
    expect(r["0-1"]).toBe(8);
  });
});

describe("where", () => {
  it("selects from a or b based on condition", async () => {
    const cond = { "0-0": 1, "0-1": 0, "0-2": 1 };
    const a    = { "0-0": 10, "0-1": 20, "0-2": 30 };
    const b    = { "0-0": -1, "0-1": -2, "0-2": -3 };
    const r = await where([cond, a, b], {} as any);
    expect(r["0-0"]).toBe(10);
    expect(r["0-1"]).toBe(-2);
    expect(r["0-2"]).toBe(30);
  });
});

describe("countNonzero", () => {
  it("counts nonzero elements", async () => {
    const x = { "0-0": 0, "0-1": 1, "0-2": 0, "0-3": 2, "0-4": -3 };
    const r = await countNonzero([x], {} as any);
    expect(r["0-0"]).toBe(3);
  });

  it("all zeros returns 0", async () => {
    const r = await countNonzero([{ "0-0": 0, "0-1": 0 }], {} as any);
    expect(r["0-0"]).toBe(0);
  });

  it("all nonzero", async () => {
    const r = await countNonzero([{ "0-0": 1, "0-1": -2 }], {} as any);
    expect(r["0-0"]).toBe(2);
  });
});

describe("searchsorted", () => {
  it("finds insertion index in sorted array", async () => {
    const a = { "0-0": 1, "0-1": 3, "0-2": 5, "0-3": 7 };
    const r = await searchsorted([a, { "0-0": 4 }], {} as any);
    expect(r["0-0"]).toBe(2); // 4 goes between index 1 (value 3) and index 2 (value 5)
  });

  it("value equal to element returns index after it (right-biased)", async () => {
    const a = { "0-0": 1, "0-1": 3, "0-2": 5 };
    const r = await searchsorted([a, { "0-0": 3 }], {} as any);
    expect(r["0-0"]).toBe(2);
  });

  it("value before all returns 0", async () => {
    const a = { "0-0": 2, "0-1": 4, "0-2": 6 };
    const r = await searchsorted([a, { "0-0": 0 }], {} as any);
    expect(r["0-0"]).toBe(0);
  });

  it("value after all returns length", async () => {
    const a = { "0-0": 2, "0-1": 4, "0-2": 6 };
    const r = await searchsorted([a, { "0-0": 10 }], {} as any);
    expect(r["0-0"]).toBe(3);
  });
});
