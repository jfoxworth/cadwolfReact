"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import type { VirtualBlock } from "@/types/document";
import type { SolveResult } from "@/solver/types";
import type { SolveLoopMessage, SolveLoopResult, WorkerOutput } from "@/solver/worker/worker-types";
import { rawToLatex } from "@/utils/rawToLatex";
import KatexSpan from "@/components/ui/KatexSpan";

// ── Loop result types (subset of what the worker returns) ─────────────────────

interface IterationRow {
  loopValue: number;
  /** Map from child block id → { variableName, displayValue, units, error } */
  cells: Record<string, { variableName: string; value: number | null; units: string; error: string | null }>;
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ForLoopDef {
  variable: string;
  start: string;
  end: string;
  step: string;
  children: VirtualBlock[];
  finalValues?: Record<string, number>;
}

interface Props {
  block: VirtualBlock;
  canEdit?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string | null) => void;
  onDefinitionChange?: (blockId: string, newDef: Record<string, unknown>) => void;
  solverResults?: Map<string, SolveResult>;
}

// ── Helper: extract a 1×1 real scalar from solver results ─────────────────────

function getScalar(
  results: Map<string, SolveResult> | undefined,
  syntheticId: string,
): { value: number | null; error: string | null } {
  if (!results) return { value: null, error: null };
  const r = results.get(syntheticId);
  if (!r) return { value: null, error: null };
  if (r.errors.length > 0) return { value: null, error: r.errors[0] };
  const sol = r.solution;
  if (!sol) return { value: null, error: "No solution" };
  if (sol.size !== "1x1") return { value: null, error: `Must be scalar (got ${sol.size})` };
  const im = (sol as unknown as { imag?: { "0-0"?: number } }).imag?.["0-0"] ?? 0;
  if (im !== 0) return { value: null, error: "Must be a real number" };
  return { value: sol.real["0-0"] ?? 0, error: null };
}

/** Format a solved value, falling back to the raw expression string. */
function fmt(r: { value: number | null; error: string | null }, fallback: string): string {
  if (r.value === null) return fallback;
  return parseFloat(r.value.toPrecision(6)).toString();
}

/** Resolve a numeric value: prefer solved result, fall back to parsing the raw expression. */
function resolveNum(r: { value: number | null }, rawExpr: string): number | null {
  if (r.value !== null) return r.value;
  const n = parseFloat(rawExpr);
  return isNaN(n) ? null : n;
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ForLoopBlock({
  block,
  canEdit,
  isSelected,
  onSelect,
  onDefinitionChange,
  solverResults,
}: Props) {
  const def: ForLoopDef = {
    variable: "x",
    start: "0",
    end: "10",
    step: "1",
    children: [],
    ...(block.definition as Partial<ForLoopDef>),
  };

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    variable: def.variable,
    start: def.start,
    end: def.end,
    step: def.step,
  });

  useEffect(() => { if (!isSelected) setEditing(false); }, [isSelected]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Loop execution state ────────────────────────────────────────────────────
  const workerRef = useRef<Worker | null>(null);
  const [running, setRunning] = useState(false);
  const [loopRows, setLoopRows] = useState<IterationRow[] | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  // Cleanup worker on unmount
  useEffect(() => () => { workerRef.current?.terminate(); }, []);

  // Sync draft when def changes externally (e.g. after save)
  useEffect(() => {
    if (!editing) {
      setDraft({ variable: def.variable, start: def.start, end: def.end, step: def.step });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def.variable, def.start, def.end, def.step]);

  // Solved values for start / end / step
  const startRes = getScalar(solverResults, `${block.id}:start`);
  const endRes   = getScalar(solverResults, `${block.id}:end`);
  const stepRes  = getScalar(solverResults, `${block.id}:step`);

  // Use solved value if available, otherwise parse the raw expression as a number
  const startNum = resolveNum(startRes, def.start);
  const endNum   = resolveNum(endRes,   def.end);
  const stepNum  = resolveNum(stepRes,  def.step);

  const iterCount =
    startNum !== null && endNum !== null && stepNum !== null && stepNum !== 0
      ? Math.max(0, Math.floor((endNum - startNum) / stepNum))
      : null;

  const paramErrors = [startRes.error, endRes.error, stepRes.error].filter(Boolean) as string[];

  // ── Callbacks ──────────────────────────────────────────────────────────────

  const handleClick = useCallback(() => onSelect?.(block.id), [onSelect, block.id]);

  const handleDoubleClick = useCallback(() => {
    if (!canEdit) return;
    setDraft({ variable: def.variable, start: def.start, end: def.end, step: def.step });
    setEditing(true);
  }, [canEdit, def.variable, def.start, def.end, def.step]);

  const handleSave = useCallback(() => {
    setEditing(false);
    onDefinitionChange?.(block.id, { ...block.definition, ...draft });
  }, [block.id, block.definition, draft, onDefinitionChange]);

  const handleCancel = useCallback(() => {
    setEditing(false);
    setDraft({ variable: def.variable, start: def.start, end: def.end, step: def.step });
  }, [def.variable, def.start, def.end, def.step]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") handleCancel();
    },
    [handleCancel],
  );

  // ── Child block management ─────────────────────────────────────────────────

  const children: VirtualBlock[] = Array.isArray(def.children) ? def.children : [];

  const addChild = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const newChild: VirtualBlock = {
        id: `child-${crypto.randomUUID()}`,
        refId: "",
        type: "EQUATION",
        order: children.length,
        definition: { raw: "", displayEq: "", width: "full" },
        _status: "new",
      };
      onDefinitionChange?.(block.id, {
        ...block.definition,
        children: [...children, newChild],
      });
    },
    [block.id, block.definition, children, onDefinitionChange],
  );

  const updateChildRaw = useCallback(
    (childId: string, newRaw: string) => {
      const updated = children.map((c) =>
        c.id === childId ? { ...c, definition: { ...c.definition, raw: newRaw } } : c,
      );
      onDefinitionChange?.(block.id, { ...block.definition, children: updated });
    },
    [block.id, block.definition, children, onDefinitionChange],
  );

  const removeChild = useCallback(
    (childId: string) => {
      onDefinitionChange?.(block.id, {
        ...block.definition,
        children: children.filter((c) => c.id !== childId),
      });
    },
    [block.id, block.definition, children, onDefinitionChange],
  );

  // ── Loop run handler ────────────────────────────────────────────────────────

  const handleRun = useCallback(() => {
    if (startRes.value === null || endRes.value === null || stepRes.value === null) return;
    if (stepRes.value === 0) return;

    setRunning(true);
    setLoopRows(null);
    setRunError(null);

    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL("@/solver/worker/worker.ts", import.meta.url),
      );
    }

    workerRef.current.onmessage = (e: MessageEvent<WorkerOutput>) => {
      const msg = e.data;
      if (msg.type === "SOLVE_LOOP_RESULT") {
        const iterations = (msg as SolveLoopResult).iterations;
        const rows: IterationRow[] = iterations.map((iter) => {
          const cells: IterationRow["cells"] = {};
          for (const r of iter.childResults) {
            cells[r.blockId] = {
              variableName: r.variableName,
              value: r.solution ? (r.solution.real["0-0"] ?? null) : null,
              units: r.solution?.units ?? "",
              error: r.errors[0] ?? null,
            };
          }
          return { loopValue: iter.loopValue, cells };
        });
        setLoopRows(rows);
        setRunning(false);

        // Expose last-iteration scalar values so equations below can reference them.
        const lastIter = iterations[iterations.length - 1];
        if (lastIter) {
          const finalValues: Record<string, number> = {};
          for (const r of lastIter.childResults) {
            if (!r.variableName || !r.solution || r.errors.length > 0) continue;
            if (r.solution.size !== "1x1") continue;
            const val = r.solution.real["0-0"];
            if (val !== undefined) finalValues[r.variableName] = val * r.solution.multiplier;
          }
          onDefinitionChange?.(block.id, { ...block.definition, finalValues });
        }
      } else if (msg.type === "ERROR") {
        setRunError(msg.message);
        setRunning(false);
      }
    };

    const parentContext = solverResults
      ? Array.from(solverResults.values())
          .filter((r) => r.solution !== null && r.variableName)
          .map((r) => ({ blockId: r.blockId, variableName: r.variableName, solution: r.solution! }))
      : [];

    const payload: SolveLoopMessage = {
      type: "SOLVE_LOOP",
      variable: def.variable,
      start: startRes.value,
      end: endRes.value,
      step: stepRes.value,
      childBlocks: children.map((c, i) => ({
        id: c.id,
        order: i + 1,
        type: "EQUATION",
        definition: c.definition as { raw?: string },
      })),
      parentContext,
    };
    workerRef.current.postMessage(payload);
  }, [startRes.value, endRes.value, stepRes.value, def.variable, children, solverResults, block.id, block.definition, onDefinitionChange]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      onClick={handleClick}
      className={[
        "rounded-lg border-2 overflow-hidden select-none",
        isSelected ? "border-blue-400" : "border-orange-300",
        canEdit ? "cursor-pointer" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* ── Header bar ──────────────────────────────────────────────────── */}
      <div className="bg-orange-50 border-b border-orange-200 px-4 py-3">
        {editing ? (
          <div className="flex flex-col gap-3" onKeyDown={handleKeyDown}>
            {/* Edit row */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-2 font-mono text-sm">
              <span className="text-orange-700 font-bold">for</span>

              <input
                autoFocus
                type="text"
                value={draft.variable}
                onChange={(e) => setDraft((d) => ({ ...d, variable: e.target.value }))}
                placeholder="var"
                className="w-14 rounded border border-orange-300 px-2 py-1 text-sm font-mono focus:border-blue-400 focus:outline-none"
              />
              <span className="text-orange-700">=</span>
              <input
                type="text"
                value={draft.start}
                onChange={(e) => setDraft((d) => ({ ...d, start: e.target.value }))}
                placeholder="start"
                className="w-28 rounded border border-orange-300 px-2 py-1 text-sm font-mono focus:border-blue-400 focus:outline-none"
              />

              <span className="text-orange-500">;  while </span>

              <span className="text-orange-700 rounded border border-gray-200 bg-gray-50 px-2 py-1 text-gray-400">
                {draft.variable || "var"}
              </span>
              <span className="text-orange-700">&lt;</span>
              <input
                type="text"
                value={draft.end}
                onChange={(e) => setDraft((d) => ({ ...d, end: e.target.value }))}
                placeholder="end"
                className="w-28 rounded border border-orange-300 px-2 py-1 text-sm font-mono focus:border-blue-400 focus:outline-none"
              />

              <span className="text-orange-500">;  step </span>

              <input
                type="text"
                value={draft.step}
                onChange={(e) => setDraft((d) => ({ ...d, step: e.target.value }))}
                placeholder="step"
                className="w-28 rounded border border-orange-300 px-2 py-1 text-sm font-mono focus:border-blue-400 focus:outline-none"
              />
            </div>

            <div className="text-xs text-gray-400 font-mono">
              Expressions can reference any variable defined above this block.
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* ── View mode ── */
          <div className="flex flex-col gap-2" onDoubleClick={handleDoubleClick}>
            {/* Loop header line */}
            <div className="font-mono text-sm text-orange-900 flex flex-wrap gap-x-1.5 items-center">
              <span className="text-orange-600 font-bold">for</span>
              <span>{def.variable}</span>
              <span className="text-orange-500">=</span>
              <span
                className={startRes.error ? "text-red-500" : "text-gray-800"}
                title={startRes.error ?? def.start}
              >
                {fmt(startRes, def.start)}
              </span>
              <span className="text-orange-300 mx-1">;</span>
              <span>{def.variable}</span>
              <span className="text-orange-500">&lt;</span>
              <span
                className={endRes.error ? "text-red-500" : "text-gray-800"}
                title={endRes.error ?? def.end}
              >
                {fmt(endRes, def.end)}
              </span>
              <span className="text-orange-300 mx-1">;</span>
              <span>{def.variable}</span>
              <span className="text-orange-500">=</span>
              <span>{def.variable}</span>
              <span className="text-orange-500">+</span>
              <span
                className={stepRes.error ? "text-red-500" : "text-gray-800"}
                title={stepRes.error ?? def.step}
              >
                {fmt(stepRes, def.step)}
              </span>
            </div>

            {/* Info + action row */}
            <div className="flex items-center gap-3">
              {iterCount !== null ? (
                <span className="rounded bg-orange-100 border border-orange-200 px-2 py-0.5 text-xs text-orange-700 font-medium">
                  {iterCount} iteration{iterCount !== 1 ? "s" : ""}
                </span>
              ) : (
                <span className="text-xs text-gray-400">iteration count unknown — enter numeric start/end/step</span>
              )}
              {iterCount !== null && iterCount > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleRun(); }}
                  disabled={running}
                  className="rounded bg-orange-500 px-4 py-1 text-xs font-medium text-white hover:bg-orange-600 disabled:opacity-50"
                >
                  {running ? "Running…" : "▶ Run"}
                </button>
              )}
              {canEdit && (
                <span className="ml-auto text-xs text-orange-300">double-click to edit</span>
              )}
            </div>
          </div>
        )}

        {/* Param errors */}
        {paramErrors.length > 0 && !editing && (
          <div className="mt-2 flex flex-col gap-0.5">
            {paramErrors.map((err, i) => (
              <span key={i} className="text-xs text-red-500">
                {err}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Loop body ────────────────────────────────────────────────────── */}
      <div className="bg-white border-l-4 border-orange-200 ml-4 pl-3 pr-4 py-3 flex flex-col gap-2">
        {iterCount !== null && iterCount > 0 && (
          <div className="text-xs text-orange-400 font-mono">
            {def.variable} ∈ [{fmt(startRes, def.start)}, {fmt(startRes, def.start)} + {fmt(stepRes, def.step)}, …, &lt; {fmt(endRes, def.end)}]
          </div>
        )}

        {children.length === 0 && (
          <p className="text-xs text-gray-400 italic py-1">
            No equations inside this loop yet.
          </p>
        )}

        {children.map((child) => (
          <ChildEquationBlock
            key={child.id}
            child={child}
            canEdit={!!canEdit}
            loopVariable={def.variable}
            onRawChange={updateChildRaw}
            onRemove={removeChild}
          />
        ))}

        {canEdit && (
          <button
            onClick={addChild}
            className="mt-1 self-start rounded border border-dashed border-orange-300 px-3 py-1.5 text-xs text-orange-600 hover:border-orange-400 hover:bg-orange-50"
          >
            + Add equation
          </button>
        )}

        {/* ── Results table ──────────────────────────────────────────── */}
        {runError && (
          <div className="mt-2 text-xs text-red-500">Run error: {runError}</div>
        )}
        {loopRows && loopRows.length > 0 && children.length > 0 && (
          <LoopResultsTable
            rows={loopRows}
            children={children}
            loopVariable={def.variable}
          />
        )}
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div className="bg-orange-50 border-t border-orange-200 px-4 py-1">
        <span className="font-mono text-xs text-orange-400">
          end for {def.variable}
        </span>
      </div>
    </div>
  );
}

// ── Loop results table ─────────────────────────────────────────────────────────

const MAX_ROWS_SHOWN = 50;

interface LoopResultsTableProps {
  rows: IterationRow[];
  children: VirtualBlock[];
  loopVariable: string;
}

function LoopResultsTable({ rows, children, loopVariable }: LoopResultsTableProps) {
  const [expanded, setExpanded] = useState(false);

  // Get column headers from first row
  const cols = children
    .map((c) => {
      const firstRow = rows[0];
      const cell = firstRow?.cells[c.id];
      return { id: c.id, label: cell?.variableName || (c.definition as { raw?: string }).raw || c.id };
    });

  const visibleRows = expanded ? rows : rows.slice(0, MAX_ROWS_SHOWN);
  const truncated = !expanded && rows.length > MAX_ROWS_SHOWN;

  const fmtVal = (cell: IterationRow["cells"][string] | undefined) => {
    if (!cell) return "—";
    if (cell.error) return <span className="text-red-400" title={cell.error}>err</span>;
    if (cell.value === null) return "—";
    const v = parseFloat(cell.value.toPrecision(6)).toString();
    return cell.units ? `${v} ${cell.units}` : v;
  };

  return (
    <div className="mt-3 overflow-x-auto rounded border border-orange-100" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between px-3 py-1.5 bg-orange-50 border-b border-orange-100">
        <span className="text-xs font-medium text-orange-700">
          Results — {rows.length} iteration{rows.length !== 1 ? "s" : ""}
        </span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 text-gray-500">
            <th className="px-3 py-1.5 text-left font-mono font-medium border-r border-gray-100">
              {loopVariable}
            </th>
            {cols.map((col) => (
              <th key={col.id} className="px-3 py-1.5 text-left font-mono font-medium border-r border-gray-100 last:border-r-0">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
              <td className="px-3 py-1 font-mono text-orange-700 border-r border-gray-100">
                {parseFloat(row.loopValue.toPrecision(6)).toString()}
              </td>
              {cols.map((col) => (
                <td key={col.id} className="px-3 py-1 font-mono text-gray-700 border-r border-gray-100 last:border-r-0">
                  {fmtVal(row.cells[col.id])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {truncated && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full py-1.5 text-xs text-orange-500 hover:text-orange-700 hover:bg-orange-50 border-t border-orange-100"
        >
          Show all {rows.length} rows…
        </button>
      )}
    </div>
  );
}

// ── Child equation block ───────────────────────────────────────────────────────

interface ChildProps {
  child: VirtualBlock;
  canEdit: boolean;
  loopVariable: string;
  onRawChange: (id: string, raw: string) => void;
  onRemove: (id: string) => void;
}

function ChildEquationBlock({ child, canEdit, loopVariable, onRawChange, onRemove }: ChildProps) {
  const def = child.definition as { raw?: string };
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(def.raw ?? "");

  useEffect(() => {
    if (!editing) setDraft(def.raw ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def.raw]);

  const save = () => {
    setEditing(false);
    if (draft.trim() !== (def.raw ?? "")) onRawChange(child.id, draft.trim());
  };

  const cancel = () => {
    setEditing(false);
    setDraft(def.raw ?? "");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); save(); }
    if (e.key === "Escape") cancel();
  };

  if (editing) {
    return (
      <div className="rounded border border-blue-300 bg-blue-50 p-2" onClick={(e) => e.stopPropagation()}>
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          className="w-full resize-none bg-transparent font-mono text-sm text-gray-900 focus:outline-none"
          placeholder={`${loopVariable} = expression`}
        />
        <div className="mt-1.5 flex gap-2">
          <button
            onClick={save}
            className="rounded bg-blue-600 px-2 py-0.5 text-xs text-white hover:bg-blue-700"
          >
            Save
          </button>
          <button
            onClick={cancel}
            className="rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group flex items-center justify-between rounded border border-gray-100 bg-gray-50 px-3 py-1.5 hover:border-gray-200"
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (canEdit) {
          setDraft(def.raw ?? "");
          setEditing(true);
        }
      }}
    >
      <div className="flex-1 min-w-0 text-center">
        {def.raw ? (
          <KatexSpan tex={rawToLatex(def.raw)} />
        ) : (
          <span className="text-xs text-gray-400 italic">
            {canEdit ? "double-click to add equation" : "empty equation"}
          </span>
        )}
      </div>
      {canEdit && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(child.id); }}
          className="ml-2 shrink-0 text-sm text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-600 leading-none"
        >
          ×
        </button>
      )}
    </div>
  );
}
