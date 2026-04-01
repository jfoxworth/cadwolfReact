import type { SolveContext, StepFn } from "../types";
import { PARSE_UNIT_MAP } from "../units/parse-unit-data";
import { SCALE_UNIT_MAP } from "../units/scale-unit-data";
import { parseCompound } from "../units/parse-compound";
import { encodeMatrix, isMatrixToken, decodeMatrix } from "./matrix-utils";

// Step 20b: Encode_Unit_Values
// Scans the token array for (value_token, unit_token) pairs and converts them
// into MATRIX tokens that carry the value (scaled to SI) and the base-unit
// exponent array. This lets step 26 (solvePostfix) perform unit-aware arithmetic.
//
// Handles both:
//   - Scalar number tokens   (plain or wrapped in parens)
//   - MATRIX tokens already  (e.g. matrix variables substituted by step 10)
//
// After this step, all resolved unit tokens are removed; step 21 (unitArray)
// will only find unit tokens that are attached to bare inline literals without
// an adjacent numeric token (rare in practice).

function resolveUnitStr(unitStr: string): { convFactor: number; baseArray: number[] } | null {
  // 1. Direct lookup in PARSE_UNIT_MAP (canonical SI units like "m", "N", "Pa")
  const direct = PARSE_UNIT_MAP.get(unitStr);
  if (direct) return { convFactor: 1, baseArray: [...direct.baseArray] };

  // 2. SCALE_UNIT_MAP lookup (non-SI or prefixed units like "in", "kN", "lb")
  const scaled = SCALE_UNIT_MAP.get(unitStr);
  if (scaled) {
    const base = PARSE_UNIT_MAP.get(scaled.conv_unit);
    if (base) return { convFactor: scaled.conv_factor, baseArray: [...base.baseArray] };
  }

  // 3. Compound units ("N/m^2", "kg*m/s^2", etc.)
  const terms = parseCompound(unitStr);
  if (terms.length === 0) return null;

  let convFactor = 1;
  const baseArray = [0, 0, 0, 0, 0, 0, 0, 0];

  for (const { symbol, power } of terms) {
    const sc = SCALE_UNIT_MAP.get(symbol);
    if (sc) {
      convFactor *= Math.pow(sc.conv_factor, power);
      const be = PARSE_UNIT_MAP.get(sc.conv_unit);
      if (be) for (let i = 0; i < 8; i++) baseArray[i] += be.baseArray[i] * power;
    } else {
      const be = PARSE_UNIT_MAP.get(symbol);
      if (be) for (let i = 0; i < 8; i++) baseArray[i] += be.baseArray[i] * power;
    }
  }

  return { convFactor, baseArray };
}

function parseScalarValue(tok: string): number | null {
  // Match plain numbers or parenthesised numbers (optionally negative)
  const unwrapped = tok.replace(/^\((-?.+)\)$/, "$1");
  const n = parseFloat(unwrapped.replace(/,/g, ""));
  return isNaN(n) ? null : n;
}

export const encodeUnitValues: StepFn = async (ctx: SolveContext): Promise<SolveContext> => {
  if (ctx.errors.length > 0) return ctx;

  const tokens   = [...ctx.tokens];
  const keyArray = [...ctx.keyArray];

  let i = 0;
  while (i < tokens.length) {
    // Look for a unit token immediately after a value token
    if (keyArray[i] !== 1 && i + 1 < tokens.length && keyArray[i + 1] === 1) {
      const valTok  = tokens[i];
      const unitStr = tokens[i + 1];

      const unitInfo = resolveUnitStr(unitStr);
      if (unitInfo) {
        const { convFactor, baseArray } = unitInfo;

        if (isMatrixToken(valTok)) {
          // Matrix token: scale all elements and embed base units
          const mat = decodeMatrix(valTok);
          if (mat) {
            const scaledReal: Record<string, number> = {};
            for (const [k, v] of Object.entries(mat.real)) scaledReal[k] = v * convFactor;
            const scaledImag: Record<string, number> = {};
            for (const [k, v] of Object.entries(mat.imag)) scaledImag[k] = v * convFactor;
            tokens[i] = encodeMatrix(scaledReal, mat.size, scaledImag, baseArray);
            tokens.splice(i + 1, 1);
            keyArray.splice(i + 1, 1);
            i++;
            continue;
          }
        } else {
          // Scalar token
          const val = parseScalarValue(valTok);
          if (val !== null) {
            const scaled = val * convFactor;
            tokens[i] = encodeMatrix({ "0-0": scaled }, "1x1", undefined, baseArray);
            tokens.splice(i + 1, 1);
            keyArray.splice(i + 1, 1);
            i++;
            continue;
          }
        }
      }
    }
    i++;
  }

  return { ...ctx, tokens, keyArray };
};
