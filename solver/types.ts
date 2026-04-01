// ─── Core matrix representation ───────────────────────────────────────────────
// Sparse matrix: key is "row-col" (e.g. "0-0", "1-2"), value is the number.
// Scalars are stored as { "0-0": value }.
export interface Matrix {
  [key: string]: number;
}

// ─── Unit system ──────────────────────────────────────────────────────────────
// SI base units: A (ampere), K (kelvin), s (second), m (metre),
// kg (kilogram), cd (candela), mol (mole), rad (radian)
export type UnitBaseArray = [number, number, number, number, number, number, number, number];

export interface UnitDef {
  unit: string;
  base: UnitBaseArray;
  multiplier: number;
}

export interface ScaleUnitDef {
  prefix: string;
  multiplier: number;
}

// ─── Document equation (already solved) ──────────────────────────────────────
export interface ResolvedEquation {
  blockId: string;
  order: number;                  // block.order — used for scope limiting
  variableName: string;
  solution: {
    real: Matrix;
    imag: Matrix;
    size: string;                 // "rowsxcols"
    units: string;
    baseUnits: UnitBaseArray;
    multiplier: number;
    quantity?: string;
  } | null;
  error: string | null;
}

// ─── Imported functions (files-as-functions feature) ─────────────────────────
export interface ImportedFunction {
  name: string;
  fileId: string;
  inputNames: string[];
  outputNames: string[];          // one or more output variable names
  blocks: OrderedBlock[];         // the function file's blocks
}

// ─── CAD part data ────────────────────────────────────────────────────────────
export interface CadPart {
  partId: string;
  properties: Record<string, number>;
}

// ─── Constants ────────────────────────────────────────────────────────────────
export interface ConstantDef {
  name: string;
  value: number;
  units: string;
  baseUnits: UnitBaseArray;
  multiplier: number;
}

// ─── Dataset cell map ─────────────────────────────────────────────────────────
export type DatasetCellMap = Map<string, {
  data: Array<Array<{ real: number; imag: number; units: string }>>;
}>;

// ─── Block reference (ordered, from document pseudo-DOM) ─────────────────────
export interface OrderedBlock {
  id: string;
  order: number;
  type: string;
  definition: {
    raw?: string;
    variableName?: string;
    unit?: string;
    [key: string]: unknown;
  };
}

// ─── Tokens produced during pipeline steps ───────────────────────────────────
export interface VariableToken {
  name: string;
  index: number;
  length: number;
}

export interface PostfixToken {
  type: "number" | "operator" | "function" | "matrix";
  value: string | number | Matrix;
  units?: string;
  baseUnits?: UnitBaseArray;
  multiplier?: number;
}

// ─── Solution produced by the pipeline ───────────────────────────────────────
export interface SolutionState {
  real: Matrix;
  imag: Matrix;
  size: string;                   // "rowsxcols"
  units: string;
  baseUnits: UnitBaseArray;
  multiplier: number;
  quantity: string;
}

export interface DisplayState {
  equation: string;               // LaTeX string for LHS
  solution: string;               // LaTeX string for RHS + units
  matrixSize?: string;            // e.g. "3x1" — set for non-scalar results only
  numericalModel: string;         // RHS with numeric values substituted
  unitsModel: string;             // RHS with units substituted
  dimensionsModel: string;        // RHS with matrix dimensions substituted
  quantitiesModel: string;        // RHS with physical quantity types substituted
}

// ─── SolveContext ─────────────────────────────────────────────────────────────
// Replaces the legacy `self[eqID].*` and `DOM_Object` globals.
// Every pipeline step receives and returns a SolveContext.
export interface SolveContext {
  // Identity
  eqId: string;
  fileId: string;

  // Input
  rawEquation: string;            // e.g. "delta = (5 * w * L^4) / (384 * E * I)"
  displayRaw?: string;            // Original equation before function-call substitution — used by step 31 for display
  variableName: string;           // e.g. "delta" (populated by step 01)
  rhsString: string;              // e.g. "(5 * w * L^4) / (384 * E * I)" (populated by step 01)

  // Document state (read-only — do not mutate)
  documentEquations: ResolvedEquation[];   // ordered by .order; step 10 filters to order < currentBlockOrder
  currentBlockOrder: number;               // position of the equation being solved
  constants: Map<string, ConstantDef>;
  unitList: UnitDef[];
  scaleUnits: ScaleUnitDef[];
  importedFunctions: ImportedFunction[];
  cadParts: Record<string, CadPart>;
  datasets: DatasetCellMap;

  // Working state (mutated by steps)
  workingString: string;          // equation string as it is transformed through steps

  // Token arrays (replaces legacy Solution_variable_array / Solution_key_array)
  tokens: string[];               // current list of string tokens being processed
  keyArray: number[];             // parallel 0/1 array: 1 = this token is a unit

  variableArray: VariableToken[];
  postfixArray: PostfixToken[];
  solution: SolutionState;
  display: DisplayState;
  errors: string[];
}

export type StepFn = (ctx: SolveContext) => Promise<SolveContext>;
export type BuiltinFn = (args: Matrix[], ctx: SolveContext) => Promise<Matrix>;

// ─── Solve result (returned from the public API) ──────────────────────────────
export interface SolveResult {
  blockId: string;
  order: number;
  variableName: string;
  solution: SolutionState | null;
  display: DisplayState;
  errors: string[];
}
