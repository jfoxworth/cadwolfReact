import rawConstants from "./constants.json";
import type { ConstantDef, UnitBaseArray } from "../types";

export const CONSTANT_MAP: Map<string, ConstantDef> = new Map(
  (rawConstants as Array<{ name: string; value: string; units: string; Base: string }>).map((c) => {
    const base = JSON.parse(c.Base) as Record<string, number>;
    const baseUnits: UnitBaseArray = [
      base.A || 0, base.K || 0, base.s || 0, base.m || 0,
      base.kg || 0, base.cd || 0, base.mol || 0, base.rad || 0,
    ];
    return [
      c.name,
      { name: c.name, value: parseFloat(c.value), units: c.units, baseUnits, multiplier: 1 },
    ];
  })
);
