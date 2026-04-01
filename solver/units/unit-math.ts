import type { UnitBaseArray } from "../types";

// Multiply two base-unit arrays (used when multiplying quantities)
export function multiplyUnits(a: UnitBaseArray, b: UnitBaseArray): UnitBaseArray {
  return a.map((v, i) => v + b[i]) as UnitBaseArray;
}

// Divide two base-unit arrays (used when dividing quantities)
export function divideUnits(a: UnitBaseArray, b: UnitBaseArray): UnitBaseArray {
  return a.map((v, i) => v - b[i]) as UnitBaseArray;
}

// Raise a base-unit array to a power
export function powerUnits(a: UnitBaseArray, exp: number): UnitBaseArray {
  return a.map((v) => v * exp) as UnitBaseArray;
}

// Check if a unit array is dimensionless
export function isDimensionless(a: UnitBaseArray): boolean {
  return a.every((v) => v === 0);
}
