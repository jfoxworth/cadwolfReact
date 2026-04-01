import type { CadPart, DatasetCellMap, ImportedFunction, ResolvedEquation, SolveResult, OrderedBlock } from "../types";

// ─── Messages sent TO the worker ─────────────────────────────────────────────

export interface SolveDocumentMessage {
  type: "SOLVE_DOCUMENT";
  blocks: OrderedBlock[];
  changedBlockId: string;
  resolvedMap: ResolvedEquation[];
  cadParts?: Record<string, CadPart>;
  importedFunctions?: ImportedFunction[];
  datasets?: DatasetCellMap;
}

/** Compact parent-equation context (just what the loop solver needs). */
export interface ParentEquation {
  blockId: string;
  variableName: string;
  solution: NonNullable<ResolvedEquation["solution"]>;
}

export interface SolveLoopMessage {
  type: "SOLVE_LOOP";
  /** Loop variable name, e.g. "x" */
  variable: string;
  start: number;
  end: number;
  step: number;
  /** Child EQUATION blocks inside the loop body (order starts at 1). */
  childBlocks: OrderedBlock[];
  /** Already-resolved parent equations (document context above the loop). */
  parentContext: ParentEquation[];
}

export interface SolveIfElseBranch {
  type: "if" | "elseif" | "else";
  conditions: {
    flagText: string;
    conditionText: "==" | "!=" | ">" | ">=" | "<" | "<=";
    dependentText: string;
    blockOption: "&&" | "||";
  }[];
  childBlocks: OrderedBlock[];
}

export interface SolveIfElseMessage {
  type: "SOLVE_IF_ELSE";
  branches: SolveIfElseBranch[];
  /** Already-resolved parent equations (document context above the if-else). */
  parentContext: ParentEquation[];
  /** Order of the if-else block itself — sets variable scope for condition solving. */
  blockOrder: number;
}

export interface SolveWhileLoopMessage {
  type: "SOLVE_WHILE_LOOP";
  lhs: string;
  operator: "==" | "!=" | ">" | ">=" | "<" | "<=";
  rhs: string;
  maxIterations: number;
  /** Child EQUATION blocks inside the loop body. */
  childBlocks: OrderedBlock[];
  /** Already-resolved parent equations (document context above the loop). */
  parentContext: ParentEquation[];
}

export type WorkerInput = SolveDocumentMessage | SolveLoopMessage | SolveIfElseMessage | SolveWhileLoopMessage;

// ─── Messages sent FROM the worker ───────────────────────────────────────────

export interface SolveDocumentResult {
  type: "SOLVE_DOCUMENT_RESULT";
  results: SolveResult[];         // all blocks that were (re-)solved
}

export interface LoopIterationResult {
  loopValue: number;
  childResults: SolveResult[];
}

export interface SolveLoopResult {
  type: "SOLVE_LOOP_RESULT";
  iterations: LoopIterationResult[];
}

export interface IfElseResult {
  /** Index of the first branch that matched, or -1 if none matched. */
  activeBranchIndex: number;
  childResults: SolveResult[];
}

export interface SolveIfElseResult {
  type: "SOLVE_IF_ELSE_RESULT";
  result: IfElseResult;
}

export interface WorkerError {
  type: "ERROR";
  message: string;
}

export interface WhileIterationResult {
  iteration: number;
  childResults: SolveResult[];
}

export interface SolveWhileLoopResult {
  type: "SOLVE_WHILE_LOOP_RESULT";
  iterations: WhileIterationResult[];
  terminatedByLimit: boolean;
  /** Final scalar value for each child variable (varName → value). Unitless. */
  finalValues: Record<string, number>;
}

export type WorkerOutput = SolveDocumentResult | SolveLoopResult | SolveIfElseResult | SolveWhileLoopResult | WorkerError;
