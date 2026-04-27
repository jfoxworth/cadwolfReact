/**
 * rawToLatex — converts a plain-text engineering equation string to a LaTeX string.
 *
 * Handles:
 *   - root(n, x)    → \sqrt[n]{x}
 *   - power(b, e)   → {b}^{e}
 *   - abs(x)        → \left|x\right|
 *   - sqrt(x)       → \sqrt{x}
 *   - sin/cos/…(x)  → \sin\left(x\right)
 *   - (a)/(b)       → \frac{a}{b}  (parenthesised or single-token operands)
 *   - Greek names   → \delta, \sigma, …
 *   - Subscripts    → delta_max → \delta_{max}
 *   - Exponents     → x^2 → x^{2}
 *   - Multiplication: * → \cdot
 */

const GREEK_MAP: Record<string, string> = {
  alpha:      "\\alpha",
  beta:       "\\beta",
  gamma:      "\\gamma",
  delta:      "\\delta",
  epsilon:    "\\epsilon",
  varepsilon: "\\varepsilon",
  zeta:       "\\zeta",
  eta:        "\\eta",
  theta:      "\\theta",
  iota:       "\\iota",
  kappa:      "\\kappa",
  lambda:     "\\lambda",
  mu:         "\\mu",
  nu:         "\\nu",
  xi:         "\\xi",
  pi:         "\\pi",
  rho:        "\\rho",
  sigma:      "\\sigma",
  tau:        "\\tau",
  upsilon:    "\\upsilon",
  phi:        "\\phi",
  chi:        "\\chi",
  psi:        "\\psi",
  omega:      "\\omega",
  // Uppercase
  Gamma:   "\\Gamma",
  Delta:   "\\Delta",
  Theta:   "\\Theta",
  Lambda:  "\\Lambda",
  Xi:      "\\Xi",
  Pi:      "\\Pi",
  Sigma:   "\\Sigma",
  Upsilon: "\\Upsilon",
  Phi:     "\\Phi",
  Psi:     "\\Psi",
  Omega:   "\\Omega",
};

// Trig / math functions that map directly to \name
const LATEX_FUNCTIONS = new Set([
  "sin", "cos", "tan", "cot", "sec", "csc",
  "sinh", "cosh", "tanh",
  "arcsin", "arccos", "arctan",
  "log", "ln", "exp",
  "max", "min",
]);

// Functions whose display name differs from their source name
const LATEX_FUNCTION_ALIAS: Record<string, string> = {
  asin: "arcsin",
  acos: "arccos",
  atan: "arctan",
  atan2: "arctan",
};

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Convert a single identifier (with optional _subscript) to LaTeX. */
function identToLatex(id: string): string {
  const [base, ...subParts] = id.split("_");
  const baseLatex = GREEK_MAP[base] ?? base;
  if (subParts.length === 0) return baseLatex;
  return `${baseLatex}_{${subParts.join("_")}}`;
}

/**
 * Find the index of the closing ")" in s, assuming we have already consumed the
 * opening "(", so we start at depth = 1.
 */
function findClose(s: string): number {
  let depth = 1;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "(") depth++;
    else if (s[i] === ")" && --depth === 0) return i;
  }
  return s.length - 1; // unmatched — treat end as close
}

/** Split an argument string by commas at paren/bracket depth 0. */
function splitArgs(s: string): string[] {
  const args: string[] = [];
  let depth = 0, start = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "(" || s[i] === "[") depth++;
    else if (s[i] === ")" || s[i] === "]") depth--;
    else if (s[i] === "," && depth === 0) {
      args.push(s.slice(start, i).trim());
      start = i + 1;
    }
  }
  args.push(s.slice(start).trim());
  return args.filter((a) => a.length > 0);
}

// ─── Pass 1: expand function calls ───────────────────────────────────────────

/**
 * Recursively expand known function calls to their LaTeX equivalents.
 * Handles: root, power, abs, sqrt, and trig/math functions.
 * Unknown functions are wrapped in \operatorname{name}\left(...\right).
 */
function expandFunctions(expr: string): string {
  let result = "";
  let i = 0;

  while (i < expr.length) {
    // Try to match an identifier immediately followed by "("
    const idMatch = expr.slice(i).match(/^([A-Za-z][A-Za-z0-9_]*)\s*\(/);
    if (!idMatch) {
      result += expr[i++];
      continue;
    }

    const fnName = idMatch[1];
    const afterOpen = i + idMatch[0].length; // index right after the "("
    const closeIdx = findClose(expr.slice(afterOpen));
    const argsStr = expr.slice(afterOpen, afterOpen + closeIdx);
    // Recursively expand function calls inside each argument
    const args = splitArgs(argsStr).map((a) => expandFunctions(a));

    let tex: string;

    if (fnName.toLowerCase() === "ifelse" && args.length >= 4) {
      // IfElse(testVal, op, compareVal, trueVal[, falseVal])
      // Rendered as a LaTeX cases block so nested IfElse looks like if/else
      const OP_MAP: Record<string, string> = {
        "==": "=", "!=": "\\neq",
        ">": ">", "<": "<",
        ">=": "\\geq", "<=": "\\leq",
        "&gt;=": "\\geq", "&lt;=": "\\leq",
        "&gt;": ">", "&lt;": "<",
      };
      const rawOp = args[1].trim();
      const opLatex = OP_MAP[rawOp] ?? rawOp;
      const condition = `${args[0]} ${opLatex} ${args[2]}`;
      const trueVal = args[3];
      const falseVal = args[4] ?? "0";
      tex = `\\begin{cases} ${trueVal} & \\textit{if } ${condition} \\\\ ${falseVal} & \\textit{otherwise} \\end{cases}`;
    } else if (fnName.toLowerCase() === "root" && args.length === 2) {
      // root(n, x)  →  \sqrt[n]{x}
      tex = `\\sqrt[${args[0]}]{${args[1]}}`;
    } else if (fnName.toLowerCase() === "power" && args.length === 2) {
      // power(exp, base)  →  {base}^{exp}  (exponent is first arg, base is second)
      tex = `\\left(${args[1]}\\right)^{${args[0]}}`;
    } else if (fnName === "abs" && args.length === 1) {
      // abs(x)  →  \left|x\right|
      tex = `\\left|${args[0]}\\right|`;
    } else if ((fnName === "sqrt" || fnName === "Sqrt") && args.length === 1) {
      tex = `\\sqrt{${args[0]}}`;
    } else if (LATEX_FUNCTION_ALIAS[fnName]) {
      tex = `\\${LATEX_FUNCTION_ALIAS[fnName]}\\left(${args.join(",\\,")}\\right)`;
    } else if (LATEX_FUNCTIONS.has(fnName)) {
      // sin(x), cos(x), log(x), …
      tex = `\\${fnName}\\left(${args.join(",\\,")}\\right)`;
    } else {
      // Unknown function — preserve but render cleanly
      tex = `\\operatorname{${fnName}}\\left(${args.join(",\\,")}\\right)`;
    }

    result += tex;
    i = afterOpen + closeIdx + 1; // skip past the closing ")"
  }

  return result;
}

// ─── Pass 2: expand division to \frac ────────────────────────────────────────

// Characters that can form a "simple token" (not an operator or whitespace)
const TOKEN_CHARS = /^([A-Za-z0-9_.\\{}[\]^]+)/;
const TOKEN_CHARS_END = /([A-Za-z0-9_.\\{}[\]^]+)$/;

/**
 * Walk forward from position `pos` in `s`, capturing one balanced {...} group.
 * Returns the index after the closing "}". Assumes s[pos] === "{".
 */
function captureBalancedBrace(s: string, pos: number): number {
  let d = 1;
  pos++;
  while (pos < s.length && d > 0) {
    if (s[pos] === "{") d++;
    else if (s[pos] === "}") d--;
    pos++;
  }
  return pos;
}

/**
 * Replace a/b → \frac{a}{b} where a and b are either:
 *   - parenthesised groups  (expr)
 *   - LaTeX brace groups    \cmd{expr}  or  \cmd[n]{expr}
 *   - single non-operator tokens
 * Repeated until no "/" remains at paren/brace depth 0.
 */
function expandDivision(expr: string): string {
  let result = expr;
  let changed = true;

  while (changed) {
    changed = false;
    let depth = 0;

    for (let i = 0; i < result.length; i++) {
      // Track both () and {} depth so we only convert "/" at the top level
      if (result[i] === "(" || result[i] === "{") { depth++; continue; }
      if (result[i] === ")" || result[i] === "}") { depth--; continue; }
      if (result[i] !== "/" || depth !== 0) continue;

      // ── LHS ──────────────────────────────────────────────────────────
      const before = result.slice(0, i).trimEnd();
      let lhsStart: number;
      let lhs: string;

      if (before.endsWith(")")) {
        // Parenthesized group — walk back to matching "("
        let d = 1, j = before.length - 2;
        while (j >= 0 && d > 0) {
          if (before[j] === ")") d++;
          else if (before[j] === "(") d--;
          j--;
        }
        lhsStart = j + 1;
        if (lhsStart >= 5 && before.slice(lhsStart - 5, lhsStart) === "\\left") {
          lhsStart -= 5;
          lhs = before.slice(lhsStart);
        } else {
          lhs = before.slice(lhsStart + 1, before.length - 1); // strip outer ( )
        }
      } else if (before.endsWith("}")) {
        // LaTeX brace group — walk back to matching "{", then include preceding \cmd[opt]
        let d = 1, j = before.length - 2;
        while (j >= 0 && d > 0) {
          if (before[j] === "}") d++;
          else if (before[j] === "{") d--;
          j--;
        }
        // j is now just before the "{". Capture any \command[opt] that precedes it.
        const prefixStr = before.slice(0, j + 1).trimEnd();
        const cmdMatch = prefixStr.match(/(\\[A-Za-z]+(?:\[[^\]]*\])?[_A-Za-z0-9]*)\s*$/);
        lhsStart = cmdMatch ? prefixStr.length - cmdMatch[0].length : j + 1;
        lhs = before.slice(lhsStart); // keep braces — already valid LaTeX
      } else {
        const m = before.match(TOKEN_CHARS_END);
        if (!m) continue;
        lhsStart = before.length - m[0].length;
        lhs = m[0];
      }

      // ── RHS ──────────────────────────────────────────────────────────
      const after = result.slice(i + 1).trimStart();
      const skipSpaces = result.slice(i + 1).length - after.length;
      let rhs: string;
      let rhsLen: number;

      if (after.startsWith("(")) {
        const closeIdx = findClose(after.slice(1));
        rhs = after.slice(1, closeIdx + 1);             // strip outer ( )
        rhsLen = closeIdx + 2 + skipSpaces;
      } else if (after.startsWith("\\")) {
        // LaTeX command: \cmd, \cmd[opt], followed by zero or more {...} groups
        const cmdMatch = after.match(/^\\[A-Za-z]+(?:\[[^\]]*\])?/);
        if (!cmdMatch) continue;
        let pos = cmdMatch[0].length;
        while (after[pos] === "{") pos = captureBalancedBrace(after, pos);
        rhs = after.slice(0, pos);
        rhsLen = pos + skipSpaces;
      } else {
        const m = after.match(TOKEN_CHARS);
        if (!m) continue;
        rhs = m[0];
        rhsLen = m[0].length + skipSpaces;
      }

      const frac = `\\frac{${lhs}}{${rhs}}`;
      result =
        result.slice(0, lhsStart) +
        frac +
        result.slice(i + 1 + rhsLen);
      changed = true;
      break; // restart scan with updated string
    }
  }

  return result;
}

// ─── Pass 3+: identifier and operator substitutions ──────────────────────────

function applySubstitutions(expr: string): string {
  // Greek letters and subscripts — skip words already preceded by "\"
  expr = expr.replace(/(?<!\\)\b([A-Za-z][A-Za-z0-9_]*)\b/g, (match) => {
    return identToLatex(match);
  });

  // x^(expr) → x^{expr}
  expr = expr.replace(/\^\(([^)]+)\)/g, "^{$1}");
  // x^2 or x^n → x^{2} / x^{n}
  expr = expr.replace(/\^([A-Za-z0-9._]+)/g, "^{$1}");

  // a * b → a \cdot b
  expr = expr.replace(/\s*\*\s*/g, " \\cdot ");

  return expr;
}

// ─── Matrix literal → \begin{bmatrix} ───────────────────────────────────────

/**
 * If expr is a top-level matrix literal "[a,b;c,d]", convert it to a LaTeX
 * bmatrix. Each cell is recursively converted via exprToLatex.
 * Returns null if expr is not a top-level matrix literal.
 */
function tryMatrixToLatex(expr: string): string | null {
  const s = expr.trim();
  if (!s.startsWith("[") || !s.endsWith("]")) return null;

  // Confirm the opening "[" matches the closing "]" at the top level
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "[" || s[i] === "(") depth++;
    else if (s[i] === "]" || s[i] === ")") depth--;
    if (depth === 0 && i < s.length - 1) return null; // closes before end — not a simple matrix
  }

  const inner = s.slice(1, -1);

  // Split by ";" at bracket depth 0 to get rows
  const rowStrs: string[] = [];
  let cur = "";
  let d = 0;
  for (let i = 0; i < inner.length; i++) {
    if (inner[i] === "[" || inner[i] === "(") { d++; cur += inner[i]; }
    else if (inner[i] === "]" || inner[i] === ")") { d--; cur += inner[i]; }
    else if (inner[i] === ";" && d === 0) { rowStrs.push(cur); cur = ""; }
    else { cur += inner[i]; }
  }
  rowStrs.push(cur);

  const rows = rowStrs.map((row) => {
    // Split each row by "," at depth 0
    const cells: string[] = [];
    let cell = "";
    let cd = 0;
    for (let i = 0; i < row.length; i++) {
      if (row[i] === "[" || row[i] === "(") { cd++; cell += row[i]; }
      else if (row[i] === "]" || row[i] === ")") { cd--; cell += row[i]; }
      else if (row[i] === "," && cd === 0) { cells.push(cell.trim()); cell = ""; }
      else { cell += row[i]; }
    }
    cells.push(cell.trim());
    return cells.map((c) => exprToLatex(c)).join(" & ");
  });

  return `\\begin{bmatrix}${rows.join(" \\\\ ")}\\end{bmatrix}`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

function exprToLatex(expr: string): string {
  expr = expr.trim();
  const matTex = tryMatrixToLatex(expr);
  if (matTex !== null) return matTex;
  expr = expandFunctions(expr);   // root(…), power(…), sin(…), …
  expr = expandDivision(expr);    // (a)/(b) → \frac{a}{b}
  expr = applySubstitutions(expr); // Greek, ^, *
  return expr;
}

/**
 * Convert a full equation string "lhs = rhs" to LaTeX.
 * Falls back to expression-only conversion if no "=" is found.
 */
export function rawToLatex(raw: string): string {
  const eqIdx = raw.indexOf("=");
  if (eqIdx === -1) return exprToLatex(raw);

  const lhs = raw.slice(0, eqIdx).trim();
  const rhs = raw.slice(eqIdx + 1).trim();

  return `${identToLatex(lhs)} = ${exprToLatex(rhs)}`;
}
