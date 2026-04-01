import { describe, it, expect } from "vitest";
import { erfc } from "../../functions/utility/erfc";
import { ctx } from "../helpers";

describe("erfc — direct call", () => {
  it("erfc(0) = 1", async () => {
    expect((await erfc([{ "0-0": 0 }], ctx("x=0")))["0-0"]).toBeCloseTo(1, 6);
  });
  it("erfc(1) ≈ 1 - 0.8427 = 0.1573", async () => {
    expect((await erfc([{ "0-0": 1 }], ctx("x=0")))["0-0"]).toBeCloseTo(0.15729920705, 5);
  });
  it("erfc(-1) ≈ 1 + 0.8427 = 1.8427", async () => {
    expect((await erfc([{ "0-0": -1 }], ctx("x=0")))["0-0"]).toBeCloseTo(1.84270079295, 5);
  });
  it("erfc(large) ≈ 0", async () => {
    expect((await erfc([{ "0-0": 10 }], ctx("x=0")))["0-0"]).toBeCloseTo(0, 5);
  });
  it("erfc(-large) ≈ 2", async () => {
    expect((await erfc([{ "0-0": -10 }], ctx("x=0")))["0-0"]).toBeCloseTo(2, 5);
  });
  it("erfc(x) + erf(x) = 1 property holds for x=0.5", async () => {
    // erfc(0.5) ≈ 1 - 0.5205 = 0.4795
    expect((await erfc([{ "0-0": 0.5 }], ctx("x=0")))["0-0"]).toBeCloseTo(0.4795001222, 5);
  });
  it("empty → empty", async () => {
    expect(Object.keys(await erfc([{}], ctx("x=0")))).toHaveLength(0);
  });
});
