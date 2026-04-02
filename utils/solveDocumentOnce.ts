import type { OrderedBlock, SolveResult } from "@/solver/types";

/**
 * Runs the browser Web Worker solver once on the given blocks and returns all results.
 * Creates a one-time worker and terminates it when done.
 */
export function solveDocumentOnce(blocks: OrderedBlock[]): Promise<SolveResult[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("../solver/worker/worker.ts", import.meta.url));

    worker.onmessage = (e: MessageEvent) => {
      if (e.data.type === "SOLVE_DOCUMENT_RESULT") {
        worker.terminate();
        resolve(e.data.results as SolveResult[]);
      }
    };

    worker.onerror = (err) => {
      worker.terminate();
      reject(err);
    };

    worker.postMessage({
      type: "SOLVE_DOCUMENT",
      blocks,
      changedBlockId: blocks[0]?.id ?? "",
      resolvedMap: [],
      cadParts: {},
      importedFunctions: [],
    });
  });
}
