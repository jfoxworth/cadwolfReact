import { rawToLatex } from "@/utils/rawToLatex";
import { describe, it, expect } from "vitest";

describe("rawToLatex", () => {
  it("root(n, x) → \\sqrt[n]{x}", () => {
    expect(rawToLatex("x = root(2, 4)")).toBe("x = \\sqrt[2]{4}");
  });

  it("power(exp, base) → {base}^{exp}", () => {
    expect(rawToLatex("x = power(a, 3)")).toBe("x = {3}^{a}");
  });

  it("(a)/(b) → \\frac{a}{b}", () => {
    expect(rawToLatex("x = (a + b) / (c + d)")).toBe("x = \\frac{a + b}{c + d}");
  });

  it("simple a/b → \\frac{a}{b}", () => {
    expect(rawToLatex("x = a / b")).toBe("x = \\frac{a}{b}");
  });

  it("quadratic formula — root, power, and division all present", () => {
    const r = rawToLatex("y_1 = (-b + root(2, power(2, b) - 4*a*c)) / (2*a)");
    console.log("quadratic:", r);
    expect(r).toContain("\\sqrt[2]");
    expect(r).toContain("\\frac");
    expect(r).toContain("^{");
    expect(r).toContain("\\cdot");
    expect(r).toContain("y_{1}");
  });

  it("sin(theta) → \\sin\\left(\\theta\\right)", () => {
    const r = rawToLatex("x = sin(theta)");
    expect(r).toContain("\\sin");
    expect(r).toContain("\\theta");
  });

  it("nested root inside root", () => {
    const r = rawToLatex("x = root(2, root(3, y))");
    expect(r).toBe("x = \\sqrt[2]{\\sqrt[3]{y}}");
  });

  it("Greek subscript on LHS", () => {
    expect(rawToLatex("delta_max = a")).toBe("\\delta_{max} = a");
  });

  it("abs(x) → \\left|x\\right|", () => {
    expect(rawToLatex("x = abs(a - b)")).toBe("x = \\left|a - b\\right|");
  });

  it("IfElse renders as cases block", () => {
    const r = rawToLatex("y = IfElse(x, >, 10, 100, 200)");
    expect(r).toContain("\\begin{cases}");
    expect(r).toContain("\\textit{if }");
    expect(r).toContain("\\textit{otherwise}");
    expect(r).toContain("100");
    expect(r).toContain("200");
  });

  it("nested IfElse renders as nested cases blocks", () => {
    const r = rawToLatex("y = IfElse(x, >, 10, IfElse(z, ==, 5, 99, 0), 200)");
    // Two begin{cases} blocks
    expect(r.split("\\begin{cases}").length - 1).toBe(2);
    expect(r).toContain("99");
    expect(r).toContain("200");
  });

  it("sqrt(a)/sqrt(b) → \\frac{\\sqrt{a}}{\\sqrt{b}}", () => {
    expect(rawToLatex("x = sqrt(a)/sqrt(b)")).toBe("x = \\frac{\\sqrt{a}}{\\sqrt{b}}");
  });

  it("sqrt(sum)/sqrt(sum) → \\frac{\\sqrt{...}}{\\sqrt{...}} at top level", () => {
    const r = rawToLatex("Dist = sqrt(Moment[0][0]^2+Moment[0][1]^2+Moment[0][2]^2)/sqrt(Force[0][0]^2+Force[0][1]^2+Force[0][2]^2)");
    // The \frac must wrap both \sqrt expressions at the top level, not appear inside \sqrt
    expect(r).toMatch(/\\frac\{\\sqrt\{.*?\}\}\{\\sqrt\{/);
  });

  it("sqrt expr divided by scalar → \\frac{\\sqrt{...}}{n}", () => {
    expect(rawToLatex("x = sqrt(a+b)/2")).toBe("x = \\frac{\\sqrt{a+b}}{2}");
  });
});
