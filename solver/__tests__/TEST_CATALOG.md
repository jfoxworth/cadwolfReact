# Test Catalog

This file documents all unit tests across `solver/__tests__/`. Update it whenever tests are added, removed, or changed. Each entry lists the test file, test count, and what scenarios are covered.

---

## solver/functions/basic/

| Function | Test File | Tests | Coverage |
|----------|-----------|-------|----------|
| `abs` | `__tests__/basic/abs.test.ts` | 14 | Scalar (+/−/0/float), row vector, 2D matrix (2×2, 3×3), empty matrix, pipeline (+/−/float/0), pipeline vector, pipeline inline 2D |
| `ceil` | `__tests__/basic/ceil.test.ts` | 16 | Scalar (pos/neg/int/small), with unit multiplier, row vector, 2D matrix (2×2, 3×3), empty matrix, pipeline (5 scalar cases), pipeline vector, pipeline inline 2D |
| `floor` | `__tests__/basic/floor.test.ts` | 16 | Scalar (pos/neg/int/small), with unit multiplier, row vector, 2D matrix (2×2, 3×3), empty matrix, pipeline (5 scalar cases), pipeline vector, pipeline inline 2D |
| `max` | `__tests__/basic/max.test.ts` | 17 | Scalar (+/−/0), vector (start/end/middle/all-neg/mixed/dupe/float), 2D matrix (2×2, 3×3, all-neg), pipeline (2 scalar), pipeline vector (2 cases), pipeline inline 2D |
| `maxInd` | `__tests__/basic/maxInd.test.ts` | 13 | Scalar, max at start/end/middle, all-same, all-neg, floats, mixed, 5-element, pipeline vector (3 cases), pipeline scalar |
| `maxu` | `__tests__/basic/maxu.test.ts` | 12 | Scalar (+/−/0), vector (basic/all-neg/mixed/floats), 2D matrix (2×2, 3×2), pipeline (2 scalar), pipeline vector (2 cases) |
| `min` | `__tests__/basic/min.test.ts` | 17 | Scalar (+/−/0), vector (start/end/middle/all-neg/mixed/dupe/float), 2D matrix (2×2, 3×3, all-neg), pipeline (2 scalar), pipeline vector (2 cases), pipeline inline 2D |
| `minInd` | `__tests__/basic/minInd.test.ts` | 13 | Scalar, min at start/end/middle, all-same, all-neg, floats, mixed, 5-element, pipeline vector (3 cases), pipeline scalar |
| `minu` | `__tests__/basic/minu.test.ts` | 12 | Scalar (+/−/0), vector (basic/all-neg/mixed/floats), 2D matrix (2×2, 3×2), pipeline (2 scalar), pipeline vector (2 cases) |
| `round` | `__tests__/basic/round.test.ts` | 22 | n=0 (pos/neg/half/int/zero), n=2, n=3, n=-1 (×2), row vector (2 cases), 2D matrix (2×2, 3×3), empty, pipeline (5 scalar), pipeline vector, pipeline inline 2D |
| `sign` | `__tests__/basic/sign.test.ts` | 18 | Scalar (+int/−int/0/+float/−float/large+/large−), vector (mixed/all-pos/all-neg), 2D matrix (2×2, 3×3), empty, pipeline (5 scalar), pipeline vector (2 cases), pipeline inline 2D |

**Total basic tests: ~170**

---

### abs — Test Details (`__tests__/basic/abs.test.ts`)

**Direct call — scalar:**
- Positive scalar `{ "0-0": 5 }` → `5`
- Negative scalar `{ "0-0": -5 }` → `5`
- Zero `{ "0-0": 0 }` → `0`
- Negative float `{ "0-0": -3.7 }` → `3.7`

**Direct call — vector:**
- Row vector `[-3, 2, -1, 0]` → `[3, 2, 1, 0]`
- All-negative vector → all positive

**Direct call — 2D matrix:**
- 2×2 matrix `[[-1,2],[-3,4]]` → `[[1,2],[3,4]]`
- 3×3 matrix with mixed values → all positive

**Direct call — edge:**
- Empty matrix `{}` → `{}`

**Pipeline:**
- `x = abs(5)` → `5`
- `x = abs(-5)` → `5`
- `x = abs(-3.7)` → `3.7`
- `x = abs(0)` → `0`
- Vector `[-3, 0, 5, -1.5]` via `documentEquations` → element-wise abs
- All-positive vector → unchanged
- Inline 2D `abs([-1,2;-3,4])` → `[[1,2],[3,4]]`

---

### ceil — Test Details (`__tests__/basic/ceil.test.ts`)

**Direct call — scalar (no multiplier):**
- `3.1` → `4`
- `-3.9` → `-3`
- `5.0` → `5`
- `-4.0` → `-4`
- `0.001` → `1`
- `-0.001` → `0`

**Direct call — with unit multiplier:**
- `1.2` with mult `0.5` → `1.5`
- `2.0` with mult `0.5` → `2.0`
- `3.1` with mult `0` → `4` (fallback to plain ceil)

**Direct call — vector:**
- `[1.1, -2.9, 3.0, -0.5]` → `[2, -2, 3, 0]`

**Direct call — 2D matrix:**
- 2×2: `[[1.1,2.9],[-1.1,-2.9]]` → `[[2,3],[-1,-2]]`
- 3×3: mixed values verified element-wise

**Direct call — edge:**
- Empty matrix `{}` → `{}`

**Pipeline:**
- `ceil(3.1)` → `4`
- `ceil(-3.9)` → `-3`
- `ceil(5)` → `5`
- `ceil(-0.1)` → `0`
- `ceil(0.9)` → `1`
- Vector `[1.1, -2.9, 3.0, -0.5]` → `[2, -2, 3, 0]`
- Inline 2D `ceil([1.1,2.9;3.0,4.3])` → `[[2,3],[3,5]]`

---

### floor — Test Details (`__tests__/basic/floor.test.ts`)

**Direct call — scalar (no multiplier):**
- `3.9` → `3`
- `-3.1` → `-4`
- `5.0` → `5`
- `-4.0` → `-4`
- `0.999` → `0`
- `-0.001` → `-1`

**Direct call — with unit multiplier:**
- `1.7` with mult `0.5` → `1.5`
- `2.0` with mult `0.5` → `2.0`
- `3.9` with mult `0` → `3` (fallback to plain floor)

**Direct call — vector:**
- `[1.9, -2.1, 3.0, -0.5]` → `[1, -3, 3, -1]`

**Direct call — 2D matrix:**
- 2×2: `[[1.9,2.1],[-1.1,-2.9]]` → `[[1,2],[-2,-3]]`
- 3×3: mixed values verified element-wise

**Direct call — edge:**
- Empty matrix `{}` → `{}`

**Pipeline:**
- `floor(3.9)` → `3`
- `floor(-3.1)` → `-4`
- `floor(5)` → `5`
- `floor(0.9)` → `0`
- `floor(-0.1)` → `-1`
- Vector `[1.9, -2.1, 3.0, -0.5]` → `[1, -3, 3, -1]`
- Inline 2D `floor([1.9,2.1;3.7,4.3])` → `[[1,2],[3,4]]`

---

### max — Test Details (`__tests__/basic/max.test.ts`)

**Direct call — scalar:**
- Single positive → same
- Single negative → same
- Zero → 0

**Direct call — vector:**
- Max at start → first element
- Max at end → last element
- Max in middle → middle element
- All negative → least negative
- Mixed pos/neg → largest positive
- Duplicates → max value
- Floats → correct max

**Direct call — 2D matrix:**
- 2×2: overall max
- 3×3: max = 9 (at `[1-1]`)
- 2×3 all-negative: least negative

**Pipeline:**
- `max(7)` → `7`
- `max(-3)` → `-3`
- Vector `[2, 8, 5, 1]` → `8`
- All-negative vector → least negative
- Inline 2D `max([1,5;3,2])` → `5`

---

### maxInd — Test Details (`__tests__/basic/maxInd.test.ts`)

**Direct call:**
- Single element → `0`
- Max at index 0 → `0`
- Max at last index → `N-1`
- Max in middle → correct index
- All same values → `0`
- All negative → index of least-negative
- Float values → correct index
- Mixed pos/neg → index of largest
- 5-element vector, max at index 4

**Pipeline:**
- `[2, 8, 5, 1]` → index `1`
- `[10, 3, 7, 2, 9]` → index `0`
- All-negative `[-4, -1, -9, -2]` → index `1`
- Single scalar → `0`

---

### maxu — Test Details (`__tests__/basic/maxu.test.ts`)

**Direct call — scalar:** positive, negative, zero

**Direct call — vector:** basic, all-neg, mixed, floats

**Direct call — 2D matrix:** 2×2, 3×2

**Pipeline:**
- `maxu(7)` → `7`
- `maxu(-3)` → `-3`
- Vector `[2, 8, 5, 1]` → `8`
- All-negative vector → least negative

---

### min — Test Details (`__tests__/basic/min.test.ts`)

*(Mirror of max with min semantics)*

**Direct call — scalar:** positive, negative, zero

**Direct call — vector:** min at start/end/middle, all-negative, mixed, duplicates, floats

**Direct call — 2D matrix:** 2×2, 3×3, 2×3 all-negative

**Pipeline:**
- `min(7)` → `7`
- `min(-3)` → `-3`
- Vector `[2, 8, 1, 5]` → `1`
- All-negative vector `[-4, -1, -9, -2]` → `-9`
- Inline 2D `min([4,1;3,2])` → `1`

---

### minInd — Test Details (`__tests__/basic/minInd.test.ts`)

*(Mirror of maxInd with min semantics)*

**Direct call:** single, min at start/end/middle, all-same, all-neg, floats, mixed, 5-element

**Pipeline:**
- `[2, 8, 1, 5]` → index `2`
- `[10, 3, 7, 2, 9]` → index `3`
- All-negative `[-4, -1, -9, -2]` → index `2`
- Single scalar → `0`

---

### minu — Test Details (`__tests__/basic/minu.test.ts`)

*(Mirror of maxu with min semantics)*

**Direct call:** scalar (pos/neg/zero), vector (basic/all-neg/mixed/floats), 2D matrix (2×2, 3×2)

**Pipeline:**
- `minu(7)` → `7`
- `minu(-3)` → `-3`
- Vector `[2, 8, 1, 5]` → `1`
- All-negative vector → most negative

---

### round — Test Details (`__tests__/basic/round.test.ts`)

**Direct call — n=0 (default):**
- `3.4` → `3`
- `3.5` → `4` (half rounds up)
- `3.9` → `4`
- `-3.4` → `-3`
- `-3.9` → `-4`
- Exact integer → unchanged
- Zero → `0`

**Direct call — explicit n:**
- n=2: `3.14159` → `3.14`
- n=2: `-2.567` → `-2.57`
- n=3: `1.23456` → `1.235`
- n=-1: `15` → `20`
- n=-1: `14` → `10`

**Direct call — vector:**
- `[1.4, 2.6, -1.5, 0.0]` n=0 → `[1, 3, -1, 0]`
- `[1.15, 2.25, 3.35]` n=1 → `[1.2, 2.3, 3.4]`

**Direct call — 2D matrix:**
- 2×2 n=0: `[[1.4,2.6],[-3.5,4.1]]` → `[[1,3],[-3,4]]`
- 3×3 n=2: verified element-wise

**Direct call — edge:**
- Empty matrix → `{}`

**Pipeline:**
- `round(3.4)` → `3`
- `round(3.5)` → `4`
- `round(3.9)` → `4`
- `round(-3.6)` → `-4`
- `round(3.14159, 2)` → `3.14`
- Vector `[1.4, 2.6, 3.5, 4.1]` → `[1, 3, 4, 4]`
- Inline 2D `round([1.4,2.6;3.5,4.1])` → `[[1,3],[4,4]]`

---

### sign — Test Details (`__tests__/basic/sign.test.ts`)

**Direct call — scalar:**
- Positive integer → `1`
- Negative integer → `-1`
- Zero → `0`
- Positive float → `1`
- Negative float → `-1`
- Large positive → `1`
- Large negative → `-1`

**Direct call — vector:**
- `[-3, 0, 5]` → `[-1, 0, 1]`
- All positive → all `1`
- All negative → all `-1`

**Direct call — 2D matrix:**
- 2×2 mixed → element-wise signs
- 3×3 mixed → verified all 9 elements

**Direct call — edge:**
- Empty matrix → `{}`

**Pipeline:**
- `sign(5)` → `1`
- `sign(-5)` → `-1`
- `sign(0)` → `0`
- `sign(0.001)` → `1`
- `sign(-0.001)` → `-1`
- Vector `[-3, 0, 5]` → `[-1, 0, 1]`
- 5-element vector `[2, -4, 0, 7, -1]` → `[1, -1, 0, 1, -1]`
- Inline 2D `sign([-1,0;2,-3])` → `[[-1,0],[1,-1]]`

---

---

## solver/functions/basic/ — Unit Tests

All unit tests are in **`__tests__/basic/units.test.ts`** and use `solveDocument` to run the full pipeline including unit conversion (step 22: scaleUnits).

### Unit Categories

| Category | Description | Examples | Conv Factor |
|----------|-------------|---------|-------------|
| Simple | SI base units, factor = 1 | m, s, kg | 1 |
| Compound | Two SI units combined, factor = 1 | m/s, N*m | 1 |
| Converted | Non-SI, requires conversion to SI | ft, in, lb | 0.3048, 0.0254, 0.4536 |

For converted units, the stored `solution.real["0-0"]` is `rawValue × conv_factor` (SI value). Tests compute expected values as `rawValue × conv_factor` using the same formula.

### Function-by-Function Unit Coverage

| Function | Simple (m) | Compound (m/s, N\*m) | Converted (ft, in, lb) | Notes |
|----------|-----------|---------------------|------------------------|-------|
| `abs` | 3 tests | 2 tests | 3 tests (ft, in, lb) | Result unit = "m" or "kg" |
| `ceil` | 3 tests | 2 tests | 3 tests (ft, in, lb) | Expected = Math.ceil(val × factor) |
| `floor` | 3 tests | 2 tests | 3 tests (ft, in, lb) | Expected = Math.floor(val × factor) |
| `max` | 2 tests | 1 test | 2 tests (ft, lb) | Scalar input |
| `maxInd` | 2 tests | 1 test | 1 test | Result is dimensionless index |
| `maxu` | 2 tests | 1 test | 1 test (ft) | Same impl as max |
| `min` | 2 tests | 1 test | 2 tests (ft, lb) | Scalar input |
| `minInd` | 1 test | 1 test | 1 test | Result is dimensionless index |
| `minu` | 2 tests | 1 test | 1 test (ft) | Same impl as min |
| `round` | 3 tests | 2 tests | 3 tests (ft, in, lb) | Expected = Math.round(val × factor) |
| `sign` | 3 tests | 2 tests | 3 tests (ft, in, lb) | Result is dimensionless (−1, 0, 1); result unit = "" |

**Total unit tests: ~55**

### Key Assertions for Converted Units

```typescript
const FT_M  = 0.3048;      // 1 ft in meters
const IN_M  = 0.0254;      // 1 in in meters
const LB_KG = 0.45359237;  // 1 lb in kilograms

// Example: abs(-5 ft) stored as SI meters
expect(r.solution?.real["0-0"]).toBeCloseTo(5 * FT_M, 4); // 1.524 m

// Example: ceil(3.7 ft) in m → ceil(1.1278) = 2
expect(r.solution?.real["0-0"]).toBeCloseTo(Math.ceil(3.7 * FT_M), 4); // 2 m
```

---

## solver/functions/numerical/ — Unit Tests

These functions evaluate an expression many times with trial values of `x` (and, for `ode4`, `y0`, `y1`, …). The unit of `x` comes from the bounds (or the x vector for `ode4`), the root or bracket comes back in that unit, and an expression that fails to evaluate (for example a unit conflict) is reported as an error. The shared evaluator is `functions/numerical/eval-with.ts`. Tests solve equation blocks top to bottom through `numerical/solve-blocks.ts`.

| Function | Test File | Tests | Coverage |
|----------|-----------|-------|----------|
| `bisect` | `__tests__/numerical/bisect.test.ts` | 6 | Plain-number root; x takes the unit of the bounds (variable in m, root in m); bounds in mm give the same root; a unit conflict in f(x) is an error, not a wrong root; bounds with different units are an error; a three-reservoir junction head with unit-bearing variables, `sign`, `abs`, `sqrt` and `log10` solves with no unit error |
| `falsepos` | `__tests__/numerical/false-pos.test.ts` | 5 | Same five cases as `bisect` |
| `secant` | `__tests__/numerical/secant.test.ts` | 5 | Same five cases as `bisect`, with two starting guesses |
| `incsearch` | `__tests__/numerical/inc-search.test.ts` | 4 | Plain-number bracket; bracket returned in the bounds' unit; unit conflict in f(x) is an error; bounds with different units are an error |
| `ode4` | `__tests__/numerical/ode4.test.ts` | 3 | Plain-number integration; y takes the unit of y0 with x in s and the derivative in m/s; a unit conflict in the derivative is an error |

The root, bracket or y values carry the unit; for `bisect`, `falsepos` and `secant` the whole `[root, error%, iterations]` row is labelled with it, so the error and iteration count show the unit too.

---

## solver/steps/ — units of sqrt, root and power inside a divided product

`__tests__/units/sqrt-in-denominator.test.ts` — 6 tests. `nu / (D * sqrt(g*h))` is dimensionless (it used to keep the sqrt's unit); the same quotient can be added to a dimensionless ratio (the pre-check in step 16 used to treat the unit inside the group as multiplied, not divided); a variable in place of the sqrt gives the same result; sqrt alone, multiplied and divided keep their units; a quotient that really has a unit, or two terms with different units, still cannot be added.

---

## solver/steps/01 — scientific notation

`__tests__/units/scientific-notation.test.ts` — 7 tests. The sign in a number's exponent (`1.004e-6`, `2.5e+3`) is part of the number: it used to be split off as an operator, so `1.004e-6 m^2/s` errored and `1.004e-6` alone read as `1.004 * e - 6`. Covers a positive and a negative exponent with a unit, capital `E`, an explicit `+`, a negative exponent with no unit, use inside expressions, and that `10-3`, `e-3` and `s2e-3` still subtract.

---

## utils/rawToLatex.ts

`__tests__/rawToLatex.test.ts` — 20 tests. The first 14 cover root, power, division to `\frac`, trig, abs, IfElse and sqrt. The last 6 cover a `power()` result next to `/`: `0.25/power(2, log10(...))` keeps each `\left` with its `(` (a brace-group operand used to be cut at the `(`, which made KaTeX fail with "Expected group as argument to \left"); `power(2, b) / c` puts `{b}^{2}` in the numerator (it used to give `{b}^\frac{{2}}{c}`); a bracketed base on both sides of `/`; and the reported equation and the power cases render in KaTeX with `throwOnError`.

---

## Future Sections (to be added)

- `solver/functions/trig/` — sin, cos, tan, asin, acos, atan, atan2, sinh, cosh, tanh, asinh, acosh, atanh, sec, csc, cot, asec, acsc, acot, asech, acsch, acoth
- `solver/functions/log/` — ln, log10, log, root, power
- `solver/functions/stats/` — mean, sum, median, mode, range, stdev, variance, cv
- `solver/functions/matrix/` — transpose (unit passes through), size, createMatrix, identity, norm, csNorm, rsNorm, trace, conj, dotMult, dotDiv, dot, cross, threshold, isColumn, isRow, isMatrix, numEl, length, fliplr, flipud, diag
- `solver/functions/linear-algebra/` — cholesky, luDecomp, inverseLu, gaussE, squash, det, matPow
- `solver/functions/fitting/` — polyfit, powerfit, logfit, expfit, histogram
- `solver/functions/calculus/` — integrate, derivative, derivativeUn
- `solver/functions/numerical/` — incSearch, bisect, falsePos, secant, ode4
- `solver/functions/signal/` — fft, fourier
- `solver/functions/data/` — append (unit carried through; unitless padding adopts the other part's unit; mixed units error), rand, randMat, numInds, intVec, row2mat, col2mat
- `solver/functions/utility/` — real, imag, rotate, parseDate, isPosDef, interpolate, ifElse, firstPos
