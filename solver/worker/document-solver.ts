import type {
  CadPart,
  DatasetCellMap,
  ImportedFunction,
  OrderedBlock,
  ResolvedEquation,
  SolveContext,
  SolveResult,
} from "../types";
import type { LoopIterationResult, ParentEquation, SolveIfElseBranch, IfElseResult, WhileIterationResult } from "./worker-types";
import { runPipeline } from "../pipeline";
import { CONSTANT_MAP } from "../units/constant-data";
import { evaluateConditions, solveExpression } from "../structures/if-else";

// ─── Build a blank SolveContext for a given block ─────────────────────────────

function makeContext(
  block: OrderedBlock,
  resolvedMap: ResolvedEquation[],
  cadParts: Record<string, CadPart> = {},
  importedFunctions: ImportedFunction[] = [],
  displayRaw?: string,
  datasets?: DatasetCellMap,
): SolveContext {
  const emptyMatrix = { "0-0": 0 };
  const emptyBase: [number,number,number,number,number,number,number,number] = [0,0,0,0,0,0,0,0];

  return {
    eqId:   block.id,
    fileId: "",

    rawEquation:      block.definition.raw ?? "",
    displayRaw:       displayRaw,
    variableName:     block.definition.variableName ?? "",
    rhsString:        "",

    documentEquations: resolvedMap,
    currentBlockOrder: block.order,

    constants:         CONSTANT_MAP,
    unitList:          [],
    scaleUnits:        [],
    importedFunctions,
    cadParts,
    datasets: datasets ?? new Map(),

    workingString:  block.definition.raw ?? "",
    tokens:         [],
    keyArray:       [],
    variableArray:  [],
    postfixArray:   [],

    solution: {
      real:       emptyMatrix,
      imag:       emptyMatrix,
      size:       "1x1",
      units:      block.definition.unit ?? "",
      baseUnits:  emptyBase,
      multiplier: 1,
      quantity:   "",
    },

    display: {
      equation: "",
      solution: "",
      numericalModel:  "",
      unitsModel:      "",
      dimensionsModel: "",
      quantitiesModel: "",
    },

    errors: [],
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─── Imported function execution ───────────────────────────────────────────────
// Runs a function document's equation blocks with the given argument values
// substituted for the function's input variable names.
// Returns an array of { name, value } for all output variables, or null on error.

async function runImportedFunction(
  fn: ImportedFunction,
  argValues: (number | null)[],
): Promise<{ name: string; value: number }[] | null> {
  // Build initial resolved map: input variable names → argument values
  const resolvedMap: ResolvedEquation[] = [];

  for (let i = 0; i < fn.inputNames.length; i++) {
    const val = argValues[i] ?? null;
    if (val === null) return null;
    resolvedMap.push({
      blockId:      `__fn_input_${i}__`,
      order:        -(fn.inputNames.length - i), // negative order so all function blocks see them
      variableName: fn.inputNames[i],
      solution: {
        real:       { "0-0": val },
        imag:       { "0-0": 0 },
        size:       "1x1",
        units:      "",
        baseUnits:  EMPTY_BASE,
        multiplier: 1,
      },
      error: null,
    });
  }

  // Run each equation block in order, skipping blocks that define input variables
  // (those are just default/placeholder values in the source document).
  const inputNameSet = new Set(fn.inputNames.map((n) => n.toLowerCase()));
  const sorted = [...fn.blocks].sort((a, b) => a.order - b.order);
  for (const block of sorted) {
    if (block.type !== "EQUATION" || !block.definition.raw) continue;
    const eqIdx = (block.definition.raw as string).indexOf("=");
    if (eqIdx >= 0) {
      const lhsVar = (block.definition.raw as string).slice(0, eqIdx).trim().toLowerCase();
      if (inputNameSet.has(lhsVar)) continue;
    }
    const ctx = makeContext(block, resolvedMap);
    const finalCtx = await runPipeline(ctx);
    if (finalCtx.errors.length === 0 && finalCtx.variableName) {
      resolvedMap.push({
        blockId:      block.id,
        order:        block.order,
        variableName: finalCtx.variableName,
        solution: {
          real:       finalCtx.solution.real,
          imag:       finalCtx.solution.imag,
          size:       finalCtx.solution.size,
          units:      finalCtx.solution.units,
          baseUnits:  finalCtx.solution.baseUnits,
          multiplier: finalCtx.solution.multiplier,
        },
        error: null,
      });
    }
  }

  // Collect output variable values
  const outputs: { name: string; value: number }[] = [];
  for (const outName of fn.outputNames) {
    const eq = [...resolvedMap].reverse().find(
      (r) => r.variableName.toLowerCase() === outName.toLowerCase(),
    );
    if (!eq?.solution) return null;
    outputs.push({ name: outName, value: (eq.solution.real["0-0"] ?? 0) * eq.solution.multiplier });
  }
  return outputs.length > 0 ? outputs : null;
}

// ─── Pre-process imported function calls ─────────────────────────────────────
// Scans the RHS of a raw equation for calls like FnName(arg1, arg2, ...).
// When found, evaluates arguments from the resolved map, runs the imported
// function's equation blocks, and replaces the call with the output value.
//
// Single output  → replaced with the scalar number string in the raw equation.
// Multiple outputs → replaced with a placeholder variable name; the real matrix
//   solution is returned as a synthetic ResolvedEquation so step 10 can
//   substitute it. MATRIX tokens cannot be inserted into raw equation strings
//   because they break the step-01 tokeniser.
//
// Returns { processedRaw, syntheticResolved }.

interface FunctionCallPreprocessResult {
  processedRaw: string;
  syntheticResolved: ResolvedEquation[];
}

async function preProcessFunctionCalls(
  raw: string,
  resolvedMap: ResolvedEquation[],
  blockOrder: number,
  importedFunctions: ImportedFunction[],
): Promise<FunctionCallPreprocessResult> {
  if (importedFunctions.length === 0) return { processedRaw: raw, syntheticResolved: [] };

  const eqIdx = raw.indexOf("=");
  if (eqIdx < 0) return { processedRaw: raw, syntheticResolved: [] };

  const lhs = raw.slice(0, eqIdx + 1);
  let rhs = raw.slice(eqIdx + 1).trim();
  const syntheticResolved: ResolvedEquation[] = [];
  let callCounter = 0;

  const available = resolvedMap
    .filter((eq) => eq.order < blockOrder && eq.solution !== null)
    .sort((a, b) => b.order - a.order);

  const getArgValue = (token: string): number | null => {
    const t = token.trim();
    const num = parseFloat(t);
    if (!isNaN(num)) return num;
    const match = available.find(
      (eq) => eq.variableName.toLowerCase() === t.toLowerCase(),
    );
    return match?.solution ? (match.solution.real["0-0"] ?? 0) * match.solution.multiplier : null;
  };

  for (const fn of importedFunctions) {
    const re = new RegExp(`\\b${escapeRegex(fn.name)}\\s*\\(([^()]*?)\\)`, "g");
    let newRhs = "";
    let lastIndex = 0;
    let m: RegExpExecArray | null;

    re.lastIndex = 0;
    while ((m = re.exec(rhs)) !== null) {
      const argTokens = m[1].split(",");
      const argValues = argTokens.map((t) => getArgValue(t));
      const outputs = await runImportedFunction(fn, argValues);

      newRhs += rhs.slice(lastIndex, m.index);
      if (outputs && outputs.length > 0) {
        if (outputs.length === 1) {
          // Single output → scalar string safe to insert directly.
          newRhs += String(outputs[0].value);
        } else {
          // Multiple outputs → use a placeholder variable name so the tokeniser
          // is not confused. Build a synthetic ResolvedEquation with the full
          // matrix solution; step 10 will substitute the placeholder with it.
          const placeholder = `_fn_${fn.name}_${callCounter}_`;
          callCounter += 1;
          const real: Record<string, number> = {};
          outputs.forEach((o, i) => { real[`0-${i}`] = o.value; });
          syntheticResolved.push({
            blockId:      `__fncall_${placeholder}__`,
            order:        blockOrder - 1, // visible to the current block only
            variableName: placeholder,
            solution: {
              real,
              imag:       {},
              size:       `1x${outputs.length}`,
              units:      "",
              baseUnits:  EMPTY_BASE,
              multiplier: 1,
            },
            error: null,
          });
          newRhs += placeholder;
        }
      } else {
        newRhs += m[0]; // leave unchanged if we couldn't resolve
      }
      lastIndex = m.index + m[0].length;
    }
    newRhs += rhs.slice(lastIndex);
    rhs = newRhs;
  }

  return { processedRaw: `${lhs} ${rhs}`, syntheticResolved };
}

// ─── Pre-process same-document sub-equation calls ─────────────────────────────
// Handles calls like "F = Force(m=5, a=9.81)" where Force is an equation block
// earlier in the same document. Parses name=value argument pairs, substitutes
// them into the matched equation's RHS, runs the pipeline, and replaces the
// call with the scalar result.
//
// This mirrors preProcessFunctionCalls but for same-document equations rather
// than imported function files.

async function preProcessSubEquationCalls(
  raw: string,
  resolvedMap: ResolvedEquation[],
  allBlocks: OrderedBlock[],
  blockOrder: number,
  cadParts: Record<string, CadPart>,
  importedFunctions: ImportedFunction[],
): Promise<string> {
  const eqIdx = raw.indexOf("=");
  if (eqIdx < 0) return raw;

  const lhs = raw.slice(0, eqIdx + 1);
  let rhs = raw.slice(eqIdx + 1).trim();

  // Set of known builtin function names (avoid treating sin(x) as a sub-eq call)
  const BUILTIN_NAMES = new Set([
    "sin","cos","tan","asin","acos","atan","atan2","sinh","cosh","tanh",
    "asinh","acosh","atanh","sec","csc","cot","asec","acsc","acot",
    "asech","acsch","acoth","ln","log","log10","log2","root","power",
    "abs","floor","ceil","round","max","min","sign","sqrt","exp","mod",
    "gcd","lcm","factorial","mean","sum","median","mode","range","stdev",
    "variance","percentile","quantile","cumsum","diff","corr","cov",
    "transpose","size","identity","zeros","ones","diag","norm","trace",
    "reshape","det","solve","eig","svd","pinv","lstsq","rank","qr",
    "cholesky","lu","cross","dot","append","sort","unique","flatten",
    "where","arange","linspace","logspace","derivative","integrate",
    "trapz","gradient","bisect","secant","falsepos","incsearch","ode4",
    "real","imag","if","fft","fourier","conv","polyfit","histogram",
    "interp","spline","erf","erfc","gamma","sinc","normcdf","norminv",
    "tcdf","tinv","chi2cdf","binocdf","binopdf","poisscdf","randn",
    "repmat","triu","tril","null","cond","expm","kron","vander","toeplitz",
    "searchsorted","diff2","cummax","cummin","clip","pad","DotMult","DotDiv",
  ]);

  // Build available variable→block lookup (only blocks with order < current)
  const available = resolvedMap
    .filter((eq) => eq.order < blockOrder && eq.solution !== null)
    .sort((a, b) => b.order - a.order);

  // Regex: word( ... name=value, ... ) — look for name=value syntax inside parens
  const callRe = /\b([A-Za-z_]\w*)\s*\(([^()]*=[^()]*)\)/g;
  let newRhs = "";
  let lastIndex = 0;
  let m: RegExpExecArray | null;

  callRe.lastIndex = 0;
  while ((m = callRe.exec(rhs)) !== null) {
    const callName = m[1];
    const argsStr  = m[2];

    // Skip builtins
    if (BUILTIN_NAMES.has(callName)) continue;

    // Check if callName matches a resolved variable (a same-document equation)
    const matchedEq = available.find(
      (eq) => eq.variableName.toLowerCase() === callName.toLowerCase(),
    );
    if (!matchedEq) continue;

    // Find the source block for this equation to get its raw string
    const sourceBlock = allBlocks.find((b) => b.id === matchedEq.blockId);
    if (!sourceBlock?.definition.raw) continue;

    // Parse name=value argument pairs
    const overrides: Record<string, string> = {};
    for (const pair of argsStr.split(",")) {
      const eqPos = pair.indexOf("=");
      if (eqPos < 0) continue;
      const argName  = pair.slice(0, eqPos).trim();
      const argValue = pair.slice(eqPos + 1).trim();
      if (argName) overrides[argName] = argValue;
    }

    // Clone the matched block's raw equation and substitute overrides into the RHS
    const srcRaw = sourceBlock.definition.raw;
    const srcEqIdx = srcRaw.indexOf("=");
    if (srcEqIdx < 0) continue;
    const srcRhsOrig = srcRaw.slice(srcEqIdx + 1).trim();

    // Substitute each override: replace word-boundary occurrences of argName
    let srcRhs = srcRhsOrig;
    for (const [argName, argValue] of Object.entries(overrides)) {
      srcRhs = srcRhs.replace(
        new RegExp(`\\b${escapeRegex(argName)}\\b`, "g"),
        `(${argValue})`,
      );
    }

    // Build a synthetic equation and run the pipeline on it
    const syntheticRaw = `${callName}_sub_ = ${srcRhs}`;
    const syntheticBlock: OrderedBlock = {
      id: `__subeq_${callName}_${m.index}__`,
      order: blockOrder - 1,
      type: "EQUATION",
      definition: { raw: syntheticRaw },
    };

    const ctx = makeContext(syntheticBlock, available, cadParts, importedFunctions);
    const { runPipeline } = await import("../pipeline");
    const finalCtx = await runPipeline(ctx);

    newRhs += rhs.slice(lastIndex, m.index);
    if (finalCtx.errors.length === 0 && finalCtx.solution.size === "1x1") {
      const val = (finalCtx.solution.real["0-0"] ?? 0) * finalCtx.solution.multiplier;
      newRhs += String(val);
    } else {
      newRhs += m[0]; // leave unchanged on error
    }
    lastIndex = m.index + m[0].length;
  }

  newRhs += rhs.slice(lastIndex);
  return `${lhs} ${newRhs}`;
}

// ─── solveDocument ────────────────────────────────────────────────────────────

export async function solveDocument(
  blocks: OrderedBlock[],
  changedBlockId: string,
  resolvedMap: ResolvedEquation[],
  cadParts: Record<string, CadPart> = {},
  importedFunctions: ImportedFunction[] = [],
  datasets: DatasetCellMap = new Map(),
): Promise<{ resolvedMap: ResolvedEquation[]; results: SolveResult[] }> {
  const map = resolvedMap.map((r) => ({ ...r }));
  const results: SolveResult[] = [];

  const sorted = [...blocks].sort((a, b) => a.order - b.order);
  const changedBlock = sorted.find((b) => b.id === changedBlockId);
  if (!changedBlock || !["EQUATION", "SLIDER", "DROPDOWN", "SELECT_BLOCK"].includes(changedBlock.type)) {
    return { resolvedMap: map, results };
  }

  // Helper: check if a raw equation string references a variable name on its RHS
  function referencesVar(raw: string, varName: string): boolean {
    const eqIdx = raw.indexOf("=");
    const rhs = eqIdx >= 0 ? raw.slice(eqIdx + 1) : raw;
    return new RegExp(`\\b${escapeRegex(varName)}\\b`, "i").test(rhs);
  }

  // The variable name produced by the changed block (used to exclude dependents
  // from priorUnresolved — those belong to Phase 2, not bootstrapping).
  const changedVarName =
    (changedBlock.definition.variableName as string | undefined) ??
    (changedBlock.definition.raw as string | undefined)?.split("=")[0].trim() ??
    "";

  // Ensure any blocks with lower order that aren't yet in the resolvedMap
  // are solved first, so the changedBlock can reference their variables.
  // Exclude blocks that reference the changed variable — they are Phase 2 dependents.
  const resolvedIds = new Set(map.map((r) => r.blockId));
  const priorUnresolved = sorted.filter(
    (b) =>
      b.order < changedBlock.order &&
      ["EQUATION", "SLIDER", "DROPDOWN", "SELECT_BLOCK"].includes(b.type) &&
      b.definition.raw &&
      !resolvedIds.has(b.id) &&
      (!changedVarName || !referencesVar(b.definition.raw as string, changedVarName)),
  );
  for (const prior of priorUnresolved) {
    const originalRaw = prior.definition.raw ?? "";
    const { processedRaw, syntheticResolved } = await preProcessFunctionCalls(originalRaw, map, prior.order, importedFunctions);
    const subEqProcessed = await preProcessSubEquationCalls(processedRaw, map, sorted, prior.order, cadParts, importedFunctions);
    const changed = subEqProcessed !== originalRaw;
    const priorBlock = changed
      ? { ...prior, definition: { ...prior.definition, raw: subEqProcessed } }
      : prior;
    const localMap = syntheticResolved.length > 0 ? [...map, ...syntheticResolved] : map;
    const ctx = makeContext(priorBlock, localMap, cadParts, importedFunctions, changed ? originalRaw : undefined, datasets);
    const finalCtx = await runPipeline(ctx);
    const resolved: ResolvedEquation = {
      blockId:      prior.id,
      order:        prior.order,
      variableName: finalCtx.variableName,
      solution:     finalCtx.errors.length === 0
        ? {
            real:       finalCtx.solution.real,
            imag:       finalCtx.solution.imag,
            size:       finalCtx.solution.size,
            units:      finalCtx.solution.units,
            baseUnits:  finalCtx.solution.baseUnits,
            multiplier: finalCtx.solution.multiplier,
          }
        : null,
      error: finalCtx.errors[0] ?? null,
    };
    map.push(resolved);
  }

  // Helper: solve one block, push result to results array and update map
  // contextOrder: when provided, overrides block.order for pipeline variable-lookup
  // (so Phase 2 dependents placed above their deps can still see all resolved vars).
  // The result and map entry always store the original block.order.
  async function solveBlock(block: OrderedBlock, contextOrder?: number): Promise<void> {
    const originalRaw = block.definition.raw ?? "";
    const effectiveOrder = contextOrder ?? block.order;
    const { processedRaw, syntheticResolved } = await preProcessFunctionCalls(originalRaw, map, effectiveOrder, importedFunctions);
    const subEqProcessed = await preProcessSubEquationCalls(processedRaw, map, sorted, effectiveOrder, cadParts, importedFunctions);
    const rawChanged = subEqProcessed !== originalRaw;
    const contextBlock = { ...block, order: effectiveOrder };
    const processedBlock = rawChanged
      ? { ...contextBlock, definition: { ...contextBlock.definition, raw: subEqProcessed } }
      : contextBlock;
    const localMap = syntheticResolved.length > 0 ? [...map, ...syntheticResolved] : map;
    const ctx = makeContext(processedBlock, localMap, cadParts, importedFunctions, rawChanged ? originalRaw : undefined, datasets);
    const finalCtx = await runPipeline(ctx);

    const result: SolveResult = {
      blockId:      block.id,
      order:        block.order,
      variableName: finalCtx.variableName,
      solution:     finalCtx.errors.length === 0 ? finalCtx.solution : null,
      display:      finalCtx.display,
      errors:       finalCtx.errors,
    };
    // Replace existing result for this block if already in results
    const existingIdx = results.findIndex((r) => r.blockId === block.id);
    if (existingIdx >= 0) {
      results[existingIdx] = result;
    } else {
      results.push(result);
    }

    const resolved: ResolvedEquation = {
      blockId:      block.id,
      order:        block.order,
      variableName: finalCtx.variableName,
      solution:     finalCtx.errors.length === 0
        ? {
            real:       finalCtx.solution.real,
            imag:       finalCtx.solution.imag,
            size:       finalCtx.solution.size,
            units:      finalCtx.solution.units,
            baseUnits:  finalCtx.solution.baseUnits,
            multiplier: finalCtx.solution.multiplier,
          }
        : null,
      error: finalCtx.errors[0] ?? null,
    };
    const mapIdx = map.findIndex((r) => r.blockId === block.id);
    if (mapIdx >= 0) {
      map[mapIdx] = resolved;
    } else {
      map.push(resolved);
    }
  }

  // Phase 1: solve the changed block and all downstream blocks (by document order).
  // This ensures every block that could see the changed variable gets a fresh result.
  const toSolve = sorted.filter(
    (b) =>
      b.order >= changedBlock.order &&
      ["EQUATION", "SLIDER", "DROPDOWN", "SELECT_BLOCK"].includes(b.type) &&
      b.definition.raw,
  );

  const solvedIds = new Set<string>();
  for (const block of toSolve) {
    await solveBlock(block);
    solvedIds.add(block.id);
  }

  // Phase 2: dependency propagation — find any blocks that were NOT in the
  // downstream set but reference a variable that was just (re-)solved.
  // Re-solve them and repeat until no new dependents are found.
  // This handles cases where an equation appears earlier in the document than
  // a variable it references (e.g. y = f(amplitude) placed before amplitude = 5).
  let propagating = true;
  while (propagating) {
    propagating = false;

    // Collect variable names from all results produced so far
    const solvedVarNames = new Set(
      results.map((r) => r.variableName.toLowerCase()).filter(Boolean),
    );

    // Find unsolved blocks that reference any of those variable names
    const dependents = sorted.filter(
      (b) =>
        !solvedIds.has(b.id) &&
        ["EQUATION", "SLIDER", "DROPDOWN", "SELECT_BLOCK"].includes(b.type) &&
        b.definition.raw &&
        Array.from(solvedVarNames).some((v) =>
          referencesVar(b.definition.raw as string, v),
        ),
    );

    // Use max order in map + 1 so Phase 2 equations above their dependencies
    // can see all currently resolved variables (pipeline filters by order).
    const maxMapOrder = map.reduce((mx, r) => Math.max(mx, r.order), 0);
    const phase2ContextOrder = maxMapOrder + 1;

    for (const block of dependents) {
      await solveBlock(block, phase2ContextOrder);
      solvedIds.add(block.id);
      propagating = true;
    }
  }

  return { resolvedMap: map, results };
}

// ─── solveLoop ─────────────────────────────────────────────────────────────────
// Executes the loop body for each iteration, injecting the loop variable as a
// resolved equation so child equations can reference it.

const EMPTY_BASE: [number,number,number,number,number,number,number,number] = [0,0,0,0,0,0,0,0];

export async function solveLoop(
  variable: string,
  start: number,
  end: number,
  step: number,
  childBlocks: OrderedBlock[],
  parentContext: ParentEquation[],
): Promise<LoopIterationResult[]> {
  if (step === 0 || (step > 0 && start >= end) || (step < 0 && start <= end)) return [];

  // Safety cap
  const maxIter = 10_000;
  const iterations: LoopIterationResult[] = [];

  // Convert parent context to ResolvedEquation[] with order=0 so all child
  // equations (order ≥ 1) can see them via the pipeline's scope filter.
  const parentResolved: ResolvedEquation[] = parentContext.map((p) => ({
    blockId: p.blockId,
    order: 0,
    variableName: p.variableName,
    solution: p.solution,
    error: null,
  }));

  const sortedChildren = [...childBlocks].sort((a, b) => a.order - b.order);

  let iterCount = 0;
  for (let v = start; step > 0 ? v < end : v > end; v += step) {
    if (++iterCount > maxIter) break;

    // Build per-iteration resolved map: parent context + loop variable
    const iterMap: ResolvedEquation[] = [
      ...parentResolved,
      {
        blockId: "__loop_var__",
        order: 0,
        variableName: variable,
        solution: {
          real: { "0-0": v },
          imag: { "0-0": 0 },
          size: "1x1",
          units: "",
          baseUnits: EMPTY_BASE,
          multiplier: 1,
        },
        error: null,
      },
    ];

    const childResults: SolveResult[] = [];

    for (const child of sortedChildren) {
      const ctx = makeContext(child, iterMap);
      const finalCtx = await runPipeline(ctx);

      const result: SolveResult = {
        blockId:      child.id,
        order:        child.order,
        variableName: finalCtx.variableName,
        solution:     finalCtx.errors.length === 0 ? finalCtx.solution : null,
        display:      finalCtx.display,
        errors:       finalCtx.errors,
      };
      childResults.push(result);

      // Make this child's result available to subsequent children in the same iter
      if (finalCtx.errors.length === 0 && finalCtx.variableName) {
        iterMap.push({
          blockId:      child.id,
          order:        child.order,
          variableName: finalCtx.variableName,
          solution: {
            real:       finalCtx.solution.real,
            imag:       finalCtx.solution.imag,
            size:       finalCtx.solution.size,
            units:      finalCtx.solution.units,
            baseUnits:  finalCtx.solution.baseUnits,
            multiplier: finalCtx.solution.multiplier,
          },
          error: null,
        });
      }
    }

    iterations.push({ loopValue: v, childResults });
  }

  return iterations;
}

// ─── solveWhileLoop ────────────────────────────────────────────────────────────
// Runs child equations each iteration, carrying variable values forward, until
// the condition evaluates false or the iteration limit is reached.

export async function solveWhileLoop(
  lhs: string,
  operator: "==" | "!=" | ">" | ">=" | "<" | "<=",
  rhs: string,
  maxIterations: number,
  childBlocks: OrderedBlock[],
  parentContext: ParentEquation[],
): Promise<{ iterations: WhileIterationResult[]; terminatedByLimit: boolean; finalValues: Record<string, number> }> {
  const cap = Math.min(Math.max(1, maxIterations), 10_000);

  const parentResolved: ResolvedEquation[] = parentContext.map((p) => ({
    blockId: p.blockId,
    order: 0,
    variableName: p.variableName,
    solution: p.solution,
    error: null,
  }));

  const sortedChildren = [...childBlocks].sort((a, b) => a.order - b.order);

  // Synthetic block used as context for evaluating the condition expressions.
  // order must be > all variable orders in the map so step 10's filter
  // (eq.order < currentBlockOrder) can see every resolved variable.
  const condBlock: OrderedBlock = {
    id: "__while_cond__",
    order: Number.MAX_SAFE_INTEGER,
    type: "EQUATION",
    definition: { raw: "___whilecond = 0" },
  };

  const evalCondition = async (map: ResolvedEquation[]): Promise<boolean | null> => {
    const baseCtx = makeContext(condBlock, map);
    const lhsVal = await solveExpression(lhs, baseCtx);
    const rhsVal = await solveExpression(rhs, baseCtx);
    if (lhsVal === null || rhsVal === null) return null;
    switch (operator) {
      case "==": return lhsVal === rhsVal;
      case "!=": return lhsVal !== rhsVal;
      case ">":  return lhsVal >   rhsVal;
      case ">=": return lhsVal >=  rhsVal;
      case "<":  return lhsVal <   rhsVal;
      case "<=": return lhsVal <=  rhsVal;
    }
  };

  const childIds = new Set(childBlocks.map((c) => c.id));

  // runningMap carries variable values across iterations
  let runningMap: ResolvedEquation[] = [...parentResolved];
  const iterations: WhileIterationResult[] = [];
  let terminatedByLimit = false;

  for (let iter = 0; iter < cap; iter++) {
    const condResult = await evalCondition(runningMap);
    if (condResult === null || condResult === false) break;
    if (iter === cap - 1) terminatedByLimit = true;

    const iterMap: ResolvedEquation[] = [...runningMap];
    const childResults: SolveResult[] = [];

    for (const child of sortedChildren) {
      const ctx = makeContext(child, iterMap);
      const finalCtx = await runPipeline(ctx);

      childResults.push({
        blockId:      child.id,
        order:        child.order,
        variableName: finalCtx.variableName,
        solution:     finalCtx.errors.length === 0 ? finalCtx.solution : null,
        display:      finalCtx.display,
        errors:       finalCtx.errors,
      });

      if (finalCtx.errors.length === 0 && finalCtx.variableName) {
        const resolved: ResolvedEquation = {
          blockId:      child.id,
          order:        child.order,
          variableName: finalCtx.variableName,
          solution: {
            real:       finalCtx.solution.real,
            imag:       finalCtx.solution.imag,
            size:       finalCtx.solution.size,
            units:      finalCtx.solution.units,
            baseUnits:  finalCtx.solution.baseUnits,
            multiplier: finalCtx.solution.multiplier,
          },
          error: null,
        };
        const idx = iterMap.findIndex((r) => r.blockId === child.id);
        if (idx >= 0) iterMap[idx] = resolved;
        else iterMap.push(resolved);
      }
    }

    iterations.push({ iteration: iter + 1, childResults });
    // Rebuild runningMap for the next iteration. Child carry-over entries are
    // placed BEFORE parent entries so that step 10's stable sort + .find()
    // returns the child's updated value when both share order 0, shadowing any
    // parent variable with the same name. Parent entries whose variable name is
    // already covered by a child carry-over are dropped to avoid ambiguity.
    const childCarryOver = iterMap
      .filter((eq) => childIds.has(eq.blockId))
      .map((eq) => ({ ...eq, order: 0 }));
    const childVarNames = new Set(
      childCarryOver.map((eq) => eq.variableName.toLowerCase()),
    );
    const parentCarryOver = parentResolved.filter(
      (eq) => !childVarNames.has(eq.variableName.toLowerCase()),
    );
    runningMap = [...childCarryOver, ...parentCarryOver];
  }

  // Collect final scalar values from child blocks only (not parent context).
  const finalValues: Record<string, number> = {};
  for (const eq of runningMap) {
    if (!childIds.has(eq.blockId)) continue;
    if (!eq.variableName || !eq.solution) continue;
    if (eq.solution.size !== "1x1") continue;
    const val = eq.solution.real["0-0"];
    if (val !== undefined) finalValues[eq.variableName] = val * eq.solution.multiplier;
  }

  return { iterations, terminatedByLimit, finalValues };
}

// ─── solveIfElse ──────────────────────────────────────────────────────────────
// Evaluates each branch in order; executes the first one whose conditions are
// true (or the "else" branch). Returns which branch matched and its child results.

export async function solveIfElse(
  branches: SolveIfElseBranch[],
  parentContext: ParentEquation[],
  blockOrder: number,
): Promise<IfElseResult> {
  const parentResolved: ResolvedEquation[] = parentContext.map((p) => ({
    blockId: p.blockId,
    order: 0,
    variableName: p.variableName,
    solution: p.solution,
    error: null,
  }));

  // Synthetic block used as context for evaluating condition expressions.
  // blockOrder ensures variables defined before the if-else are in scope.
  const condBlock: OrderedBlock = {
    id: "__ifelse_cond__",
    order: blockOrder,
    type: "EQUATION",
    definition: { raw: "___ifcond = 0" },
  };
  const condBaseCtx = makeContext(condBlock, parentResolved);

  for (let branchIdx = 0; branchIdx < branches.length; branchIdx++) {
    const branch = branches[branchIdx];

    const isActive =
      branch.type === "else"
        ? true
        : (await evaluateConditions(branch.conditions, condBaseCtx)) === true;

    if (!isActive) continue;

    // Execute child blocks in the active branch sequentially
    const iterMap: ResolvedEquation[] = [...parentResolved];
    const childResults: SolveResult[] = [];
    const sorted = [...branch.childBlocks].sort((a, b) => a.order - b.order);

    for (const child of sorted) {
      const ctx = makeContext(child, iterMap);
      const finalCtx = await runPipeline(ctx);

      childResults.push({
        blockId:      child.id,
        order:        child.order,
        variableName: finalCtx.variableName,
        solution:     finalCtx.errors.length === 0 ? finalCtx.solution : null,
        display:      finalCtx.display,
        errors:       finalCtx.errors,
      });

      if (finalCtx.errors.length === 0 && finalCtx.variableName) {
        iterMap.push({
          blockId:      child.id,
          order:        child.order,
          variableName: finalCtx.variableName,
          solution: {
            real:       finalCtx.solution.real,
            imag:       finalCtx.solution.imag,
            size:       finalCtx.solution.size,
            units:      finalCtx.solution.units,
            baseUnits:  finalCtx.solution.baseUnits,
            multiplier: finalCtx.solution.multiplier,
          },
          error: null,
        });
      }
    }

    return { activeBranchIndex: branchIdx, childResults };
  }

  // No branch matched
  return { activeBranchIndex: -1, childResults: [] };
}
