/**
 * parse-compound.ts
 *
 * Converts a compound unit string into a list of {symbol, power} terms.
 *
 * Supported syntax:
 *   "kg*m/s^2"   →  [{symbol:"kg",power:1},{symbol:"m",power:1},{symbol:"s",power:-2}]
 *   "N/m^2"      →  [{symbol:"N", power:1},{symbol:"m",power:-2}]
 *   "m^3"        →  [{symbol:"m", power:3}]
 *   "m/s"        →  [{symbol:"m", power:1},{symbol:"s",power:-1}]
 *   "kg*m^2/s^2" →  [{symbol:"kg",power:1},{symbol:"m",power:2},{symbol:"s",power:-2}]
 *
 * Rules:
 *   - Tokens are separated by "*"  (positive) or "/" (flips sign)
 *   - "^n" immediately following a symbol sets that symbol's power to ±n
 *   - Handles integer and decimal exponents (e.g. "m^0.5")
 *   - Negative exponents written as "^-2" are supported
 */

export interface UnitTerm {
  symbol: string;
  power: number;
}

export function parseCompound(unitStr: string): UnitTerm[] {
  if (!unitStr || unitStr.trim() === "") return [];

  // Expand /(A*B*C) → /A/B/C so the sign for every factor in a
  // parenthesised denominator is negative.
  // e.g. "Coulomb^2/(N*m^2)" → "Coulomb^2/N/m^2"
  const expanded = unitStr
    .trim()
    .replace(/\/\(([^)]+)\)/g, (_, group: string) => "/" + group.replace(/\*/g, "/"));

  const terms: UnitTerm[] = [];

  // Tokenise: split on * or / while keeping the delimiter
  // e.g. "kg*m/s^2" → ["kg", "*", "m", "/", "s^2"]
  const parts = expanded.split(/([*/])/);

  let sign = 1; // positive until we hit "/"

  for (const part of parts) {
    const p = part.trim();
    if (p === "*") { sign = 1;  continue; }
    if (p === "/") { sign = -1; continue; }
    if (p === "")  { continue; }

    // Split symbol from its exponent: "s^2" → symbol="s", exp=2
    const caretIdx = p.indexOf("^");
    let symbol: string;
    let power: number;

    if (caretIdx !== -1) {
      symbol = p.slice(0, caretIdx).trim();
      power  = sign * parseFloat(p.slice(caretIdx + 1));
    } else {
      symbol = p.trim();
      power  = sign * 1;
    }

    if (symbol) {
      // Merge with an existing term if the same symbol appears twice
      const existing = terms.find((t) => t.symbol === symbol);
      if (existing) {
        existing.power += power;
      } else {
        terms.push({ symbol, power });
      }
    }
  }

  // Drop zero-power terms
  return terms.filter((t) => t.power !== 0);
}

/**
 * Rebuild a unit string from a list of terms.
 * Positive-power terms come first, negative-power terms follow a "/".
 */
export function termsToUnitString(terms: UnitTerm[]): string {
  const pos = terms.filter((t) => t.power > 0);
  const neg = terms.filter((t) => t.power < 0);

  const fmt = (t: UnitTerm, abs = false): string => {
    const p = abs ? -t.power : t.power;
    return p === 1 ? t.symbol : `${t.symbol}^${p}`;
  };

  const lhs = pos.map((t) => fmt(t)).join("*") || "1";
  const rhs = neg.map((t) => fmt(t, true)).join("*");

  return rhs ? `${lhs}/${rhs}` : lhs;
}
