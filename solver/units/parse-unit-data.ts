import rawParseUnits from "./parseUnits.json";
import type { UnitBaseArray } from "../types";

// Dimension order matching UnitBaseArray: [A, K, s, m, kg, cd, mol, rad]
const DIMS = ["A", "K", "s", "m", "kg", "cd", "mol", "rad"] as const;

export interface ParseUnitEntry {
  base_unit: string;
  quantity: string;
  baseArray: UnitBaseArray;
}

export const PARSE_UNIT_MAP: Map<string, ParseUnitEntry> = new Map(
  (rawParseUnits as Array<Record<string, string>>).map((u) => [
    u.base_unit,
    {
      base_unit: u.base_unit,
      quantity: u.quantity ?? "",
      baseArray: DIMS.map((k) => parseFloat(u[k]) || 0) as unknown as UnitBaseArray,
    },
  ])
);
