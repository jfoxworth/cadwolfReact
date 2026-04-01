"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { CadPart, DatasetCellMap, ImportedFunction, OrderedBlock, ResolvedEquation, SolveResult } from "@/solver/types";
import type { WorkerInput, WorkerOutput } from "@/solver/worker/worker-types";

export type SolverResults = Map<string, SolveResult>;

interface UseSolverReturn {
  results: SolverResults;
  solvingIds: Set<string>;
  solve: (blocks: OrderedBlock[], changedBlockId: string, cadParts?: Record<string, CadPart>) => void;
  ready: boolean;
}

export function useSolver(
  initialBlocks: OrderedBlock[],
  importedFunctions: ImportedFunction[] = [],
  initialCadParts: Record<string, CadPart> = {},
  datasets: DatasetCellMap = new Map(),
): UseSolverReturn {
  const workerRef = useRef<Worker | null>(null);
  const resolvedMapRef = useRef<ResolvedEquation[]>([]);
  const cadPartsRef = useRef<Record<string, CadPart>>(initialCadParts);
  const importedFunctionsRef = useRef<ImportedFunction[]>(importedFunctions);
  const [results, setResults] = useState<SolverResults>(new Map());
  const [solvingIds, setSolvingIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  // Keep the ref in sync with the latest prop so solve() always uses current data.
  useEffect(() => {
    importedFunctionsRef.current = importedFunctions;
  }, [importedFunctions]);

  useEffect(() => {
    const worker = new Worker(new URL("@/solver/worker/worker.ts", import.meta.url));
    workerRef.current = worker;
    setReady(true);

    worker.onmessage = (e: MessageEvent<WorkerOutput>) => {
      const msg = e.data;
      if (msg.type === "SOLVE_DOCUMENT_RESULT") {
        // Clear solving indicators for the blocks that just finished
        const solvedIds = new Set(msg.results.map((r) => r.blockId));
        setSolvingIds((prev) => {
          if (prev.size === 0) return prev;
          const next = new Set(prev);
          for (const id of solvedIds) next.delete(id);
          return next;
        });
        // Merge results into local state
        setResults((prev) => {
          const next = new Map(prev);
          for (const r of msg.results) {
            next.set(r.blockId, r);
          }
          return next;
        });
        // Update our local resolvedMap reference so future solves see updated values
        for (const r of msg.results) {
          const idx = resolvedMapRef.current.findIndex((eq) => eq.blockId === r.blockId);
          const eq: ResolvedEquation = {
            blockId: r.blockId,
            order: r.order,
            variableName: r.variableName,
            solution: r.solution,
            error: r.errors[0] ?? null,
          };
          if (idx >= 0) {
            resolvedMapRef.current[idx] = eq;
          } else {
            resolvedMapRef.current.push(eq);
          }
        }
      } else if (msg.type === "ERROR") {
        console.error("[solver worker]", msg.message);
      }
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const solve = useCallback(
    (blocks: OrderedBlock[], changedBlockId: string, cadParts?: Record<string, CadPart>) => {
      if (cadParts) cadPartsRef.current = cadParts;
      if (!workerRef.current) return;
      // Mark only blocks at or after the changed block as in-flight.
      // Upstream blocks won't be re-solved so their IDs would never be cleared.
      const changedOrder =
        blocks.find((b) => b.id === changedBlockId)?.order ??
        blocks.find((b) => changedBlockId.startsWith(b.id))?.order ??
        Infinity; // block not in solver input — mark nothing as solving
      setSolvingIds(new Set(blocks.filter((b) => b.order >= changedOrder).map((b) => b.id)));
      const payload: WorkerInput = {
        type: "SOLVE_DOCUMENT",
        blocks,
        changedBlockId,
        resolvedMap: resolvedMapRef.current,
        cadParts: cadPartsRef.current,
        importedFunctions: importedFunctionsRef.current,
        datasets,
      };
      workerRef.current.postMessage(payload);
    },
    [],
  );

  return { results, solvingIds, solve, ready };
}
