/// <reference lib="webworker" />
import type { WorkerInput, WorkerOutput } from "./worker-types";
import { solveDocument, solveLoop, solveIfElse, solveWhileLoop } from "./document-solver";

self.onmessage = async (event: MessageEvent<WorkerInput>) => {
  const msg = event.data;

  try {
    if (msg.type === "SOLVE_DOCUMENT") {
      const { results } = await solveDocument(
        msg.blocks,
        msg.changedBlockId,
        msg.resolvedMap,
        msg.cadParts ?? {},
        msg.importedFunctions ?? [],
        msg.datasets ?? new Map(),
      );
      const response: WorkerOutput = { type: "SOLVE_DOCUMENT_RESULT", results };
      self.postMessage(response);
    } else if (msg.type === "SOLVE_LOOP") {
      const iterations = await solveLoop(
        msg.variable,
        msg.start,
        msg.end,
        msg.step,
        msg.childBlocks,
        msg.parentContext,
      );
      const response: WorkerOutput = { type: "SOLVE_LOOP_RESULT", iterations };
      self.postMessage(response);
    } else if (msg.type === "SOLVE_IF_ELSE") {
      const result = await solveIfElse(
        msg.branches,
        msg.parentContext,
        msg.blockOrder,
      );
      const response: WorkerOutput = { type: "SOLVE_IF_ELSE_RESULT", result };
      self.postMessage(response);
    } else if (msg.type === "SOLVE_WHILE_LOOP") {
      const { iterations, terminatedByLimit, finalValues } = await solveWhileLoop(
        msg.lhs,
        msg.operator,
        msg.rhs,
        msg.maxIterations,
        msg.childBlocks,
        msg.parentContext,
      );
      const response: WorkerOutput = { type: "SOLVE_WHILE_LOOP_RESULT", iterations, terminatedByLimit, finalValues };
      self.postMessage(response);
    }
  } catch (err) {
    const response: WorkerOutput = {
      type: "ERROR",
      message: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(response);
  }
};
