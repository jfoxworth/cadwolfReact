import { SCALE_UNIT_MAP } from "./scale-unit-data";
import { PARSE_UNIT_MAP } from "./parse-unit-data";
import { parseCompound } from "./parse-compound";

/**
 * Resolve a unit string (simple, scaled, or compound) to its 8-element
 * SI base-unit exponent array: [A, K, s, m, kg, cd, mol, rad].
 * Returns null if the unit is completely unrecognised.
 */
export function resolveBaseArray(unitStr: string): number[] | null {
  // Direct lookup — already a base SI symbol (m, kg, s, …)
  const direct = PARSE_UNIT_MAP.get(unitStr);
  if (direct) return [...direct.baseArray];

  // Scaled lookup — e.g. "km", "kN", "lb", "in"
  const scaled = SCALE_UNIT_MAP.get(unitStr);
  if (scaled) {
    const base = PARSE_UNIT_MAP.get(scaled.conv_unit);
    if (base) return [...base.baseArray];
  }

  // Compound unit — e.g. "kg/m^3", "N/m^2", "m/s^2"
  const terms = parseCompound(unitStr);
  if (terms.length === 0) return null;

  const arr = [0, 0, 0, 0, 0, 0, 0, 0];
  for (const { symbol, power } of terms) {
    const sc = SCALE_UNIT_MAP.get(symbol);
    const be = sc ? PARSE_UNIT_MAP.get(sc.conv_unit) : PARSE_UNIT_MAP.get(symbol);
    if (be) for (let i = 0; i < 8; i++) arr[i] += be.baseArray[i] * power;
  }
  return arr;
}
