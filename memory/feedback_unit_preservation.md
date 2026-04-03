---
name: Unit preservation and mandatory unit tests for solver functions
description: All solver builtin functions must preserve units; unit tests are mandatory for every function that operates on values — this has caused repeated bugs and user anger
type: feedback
---

## Hard Rule: Unit-Transparent Functions Must Preserve Units

Any builtin solver function that operates on a value but doesn't change its physical dimension (abs, round, floor, ceil, trunc, min, max, mean, median, mode, sum, stdev, etc.) MUST preserve the SI base unit array of its first argument.

**Implementation location:** `solver/steps/07-remove-builtin-equations.ts` — `UNIT_TRANSPARENT_FNS` Set. When adding a new function, check whether it is unit-transparent and add it to this Set.

**Known bug pattern:** The standard result path in step 07 writes the numeric result as a plain string. Unit preservation requires splicing a unit token after the result so downstream steps (16, 20b) embed it in the MATRIX token. The general block at the end of step 07's standard path does this for all functions in `UNIT_TRANSPARENT_FNS`.

## Hard Rule: Every Function Must Have Unit Tests

The test file `solver/__tests__/units/function-unit-preservation.test.ts` contains 4 mandatory test patterns for every relevant function:

1. **Basic unit** — `f(3 m)` → `baseUnits` has non-zero m exponent
2. **Combined units** — `f(3 kg*m/s^2)` → correct multi-dimensional baseUnits
3. **Scaled unit** — `f(3 km)` → baseUnits reflect meters (SI base), not km
4. **Complex scaled unit** — `f(25 kN)` → baseUnits reflect kg·m/s²

**When adding a new builtin function:** Before closing the PR, verify it is covered in this test file with all 4 patterns. Do NOT claim tests pass if you haven't actually added them.

## Background

This was discovered and fixed multiple times. The user was explicitly furious that:
- Unit preservation was broken repeatedly for different functions
- Unit tests were claimed to exist but didn't actually cover unit preservation
- The pattern `f(3 m)` → `baseUnits.some(v => v !== 0)` is the minimal correctness check and was missing

The fix that stuck: general `UNIT_TRANSPARENT_FNS` block in step 07 + comprehensive test file with 68 tests across 17 functions.
