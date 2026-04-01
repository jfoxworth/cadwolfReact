import type { SolveContext, StepFn } from "../types";

// Step 18: Check_Imaginary (eqSolverOld.js lines 2307-2332)
// Detects imaginary components written as "N i" or standalone "i".
//
// Transformation rules (applied right-to-left so indices stay stable):
//   number "i"  → IMAG::number   (e.g. ["4", "i"] → ["IMAG::4"])
//   "(N)" "i"   → IMAG::N        (parenthesised scalar before i)
//   bare "i"    → IMAG::1        (standalone i = 1·i)
//
// Step 26 (solve-postfix) recognises IMAG:: tokens and pushes them onto the
// stack as complex scalars { real: 0, imag: N }, enabling correct complex
// arithmetic (+, -, *, /) for all subsequent operations.
export const checkImaginary: StepFn = async (ctx: SolveContext): Promise<SolveContext> => {
  const tokens   = [...ctx.tokens];
  const keyArray = [...ctx.keyArray];

  // Scan right-to-left so splices don't shift unprocessed indices.
  for (let idx = tokens.length - 1; idx >= 0; idx--) {
    if (tokens[idx] !== "i") continue;

    const prev = idx > 0 ? tokens[idx - 1] : null;

    // Case 1: number token immediately before "i"  →  IMAG::number
    if (prev !== null && /^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+\-]?\d+)?$/.test(prev)) {
      const n = parseFloat(prev);
      tokens[idx - 1] = `IMAG::${n}`;
      tokens.splice(idx, 1);
      keyArray.splice(idx, 1);
      continue;
    }

    // Case 2: closing paren ")" before "i" — the expression inside is imaginary.
    if (prev === ")") {
      let depth = 1;
      let open  = idx - 2;
      while (open >= 0 && depth > 0) {
        if (tokens[open] === ")") depth++;
        else if (tokens[open] === "(") depth--;
        open--;
      }
      open++; // now points at the "("

      // Check for simple single-number "(N)" pattern
      const inner = tokens.slice(open + 1, idx - 1);
      if (inner.length === 1 && /^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+\-]?\d+)?$/.test(inner[0])) {
        const n = parseFloat(inner[0]);
        tokens.splice(open, idx - open + 1, `IMAG::${n}`);
        keyArray.splice(open, idx - open + 1, 0);
      } else {
        // Complex paren expression — just drop the "i" for now
        tokens.splice(idx, 1);
        keyArray.splice(idx, 1);
      }
      continue;
    }

    // Case 3: standalone "i" with no preceding number  →  IMAG::1
    tokens[idx] = "IMAG::1";
  }

  return { ...ctx, tokens, keyArray };
};
