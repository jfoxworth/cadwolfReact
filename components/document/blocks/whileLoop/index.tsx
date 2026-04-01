"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import type { VirtualBlock } from "@/types/document";
import type { SolveResult } from "@/solver/types";
import type { SolveWhileLoopMessage, SolveWhileLoopResult, WorkerOutput, WhileIterationResult } from "@/solver/worker/worker-types";
import KatexSpan from "@/components/ui/KatexSpan";
import { rawToLatex } from "@/utils/rawToLatex";

// ── Types ──────────────────────────────────────────────────────────────────────

type Operator = "==" | "!=" | ">" | ">=" | "<" | "<=";

export interface WhileLoopDef {
  lhs: string;
  operator: Operator;
  rhs: string;
  maxIterations: number;
  children: VirtualBlock[];
  /** Populated after Run — final scalar value per variable name. */
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

const OPERATORS: Operator[] = ["<", "<=", ">", ">=", "==", "!="];

// ── Main component ─────────────────────────────────────────────────────────────

export default function WhileLoopBlock({
  block,
  canEdit,
  isSelected,
  onSelect,
  onDefinitionChange,
  solverResults,
}: Props) {
  const def: WhileLoopDef = {
    lhs: "err",
    operator: ">",
    rhs: "0.001",
    maxIterations: 1000,
    children: [],
    ...(block.definition as Partial<WhileLoopDef>),
  };

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    lhs: def.lhs,
    operator: def.operator,
    rhs: def.rhs,
    maxIterations: def.maxIterations,
  });

  useEffect(() => { if (!isSelected) setEditing(false); }, [isSelected]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Loop execution state ────────────────────────────────────────────────────
  const workerRef = useRef<Worker | null>(null);
  const [running, setRunning] = useState(false);
  const [loopResult, setLoopResult] = useState<SolveWhileLoopResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  useEffect(() => () => { workerRef.current?.terminate(); }, []);

  useEffect(() => {
    if (!editing) {
      setDraft({ lhs: def.lhs, operator: def.operator, rhs: def.rhs, maxIterations: def.maxIterations });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def.lhs, def.operator, def.rhs, def.maxIterations]);

  // ── Callbacks ──────────────────────────────────────────────────────────────

  const handleClick = useCallback(() => onSelect?.(block.id), [onSelect, block.id]);

  const handleDoubleClick = useCallback(() => {
    if (!canEdit) return;
    setDraft({ lhs: def.lhs, operator: def.operator, rhs: def.rhs, maxIterations: def.maxIterations });
    setEditing(true);
  }, [canEdit, def.lhs, def.operator, def.rhs, def.maxIterations]);

  const handleSave = useCallback(() => {
    setEditing(false);
    onDefinitionChange?.(block.id, { ...block.definition, ...draft });
  }, [block.id, block.definition, draft, onDefinitionChange]);

  const handleCancel = useCallback(() => {
    setEditing(false);
    setDraft({ lhs: def.lhs, operator: def.operator, rhs: def.rhs, maxIterations: def.maxIterations });
  }, [def.lhs, def.operator, def.rhs, def.maxIterations]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => { if (e.key === "Escape") handleCancel(); },
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
      onDefinitionChange?.(block.id, { ...block.definition, children: [...children, newChild] });
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

  // ── Run handler ─────────────────────────────────────────────────────────────

  const handleRun = useCallback(() => {
    if (children.length === 0) return;
    setRunning(true);
    setLoopResult(null);
    setRunError(null);

    if (!workerRef.current) {
      workerRef.current = new Worker(new URL("@/solver/worker/worker.ts", import.meta.url));
    }

    workerRef.current.onmessage = (e: MessageEvent<WorkerOutput>) => {
      const msg = e.data;
      if (msg.type === "SOLVE_WHILE_LOOP_RESULT") {
        const result = msg as SolveWhileLoopResult;
        setLoopResult(result);
        setRunning(false);
        // Store final values in definition so downstream equations can reference them
        onDefinitionChange?.(block.id, { ...block.definition, finalValues: result.finalValues });
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

    const payload: SolveWhileLoopMessage = {
      type: "SOLVE_WHILE_LOOP",
      lhs: def.lhs,
      operator: def.operator,
      rhs: def.rhs,
      maxIterations: def.maxIterations,
      childBlocks: children.map((c, i) => ({
        id: c.id,
        order: i + 1,
        type: "EQUATION",
        definition: c.definition as { raw?: string },
      })),
      parentContext,
    };
    workerRef.current.postMessage(payload);
  }, [def.lhs, def.operator, def.rhs, def.maxIterations, children, solverResults, block.id, block.definition, onDefinitionChange]);

  // ── Render ─────────────────────────────────────────────────────────────────

  const hasFinalValues = def.finalValues && Object.keys(def.finalValues).filter((k) => !k.startsWith("_")).length > 0;

  return (
    <div
      onClick={handleClick}
      className={[
        "rounded-lg border-2 overflow-hidden select-none",
        isSelected ? "border-blue-400" : "border-purple-300",
        canEdit ? "cursor-pointer" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* ── Header bar ──────────────────────────────────────────────────── */}
      <div className="bg-purple-50 border-b border-purple-200 px-4 py-3">
        {editing ? (
          <div className="flex flex-col gap-3" onKeyDown={handleKeyDown}>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-2 font-mono text-sm">
              <span className="text-purple-700 font-bold">while</span>
              <input
                autoFocus
                type="text"
                value={draft.lhs}
                onChange={(e) => setDraft((d) => ({ ...d, lhs: e.target.value }))}
                placeholder="expression"
                className="w-32 rounded border border-purple-300 px-2 py-1 text-sm font-mono focus:border-blue-400 focus:outline-none"
              />
              <select
                value={draft.operator}
                onChange={(e) => setDraft((d) => ({ ...d, operator: e.target.value as Operator }))}
                className="rounded border border-purple-300 px-2 py-1 text-sm font-mono focus:border-blue-400 focus:outline-none"
              >
                {OPERATORS.map((op) => (
                  <option key={op} value={op}>{op}</option>
                ))}
              </select>
              <input
                type="text"
                value={draft.rhs}
                onChange={(e) => setDraft((d) => ({ ...d, rhs: e.target.value }))}
                placeholder="expression"
                className="w-32 rounded border border-purple-300 px-2 py-1 text-sm font-mono focus:border-blue-400 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 font-mono text-sm">
              <span className="text-purple-500 text-xs">max iterations:</span>
              <input
                type="number"
                value={draft.maxIterations}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    maxIterations: Math.max(1, Math.min(10000, parseInt(e.target.value) || 1)),
                  }))
                }
                className="w-24 rounded border border-purple-300 px-2 py-1 text-sm font-mono focus:border-blue-400 focus:outline-none"
              />
            </div>
            <div className="text-xs text-gray-400 font-mono">
              Expressions can reference any variable defined above or updated within this block.
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
            <div className="font-mono text-sm text-purple-900 flex flex-wrap gap-x-1.5 items-center">
              <span className="text-purple-600 font-bold">while</span>
              <span className="text-gray-800">{def.lhs}</span>
              <span className="text-purple-500">{def.operator}</span>
              <span className="text-gray-800">{def.rhs}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded bg-purple-100 border border-purple-200 px-2 py-0.5 text-xs text-purple-700 font-medium">
                max {def.maxIterations.toLocaleString()} iterations
              </span>
              {children.length > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleRun(); }}
                  disabled={running}
                  className="rounded bg-purple-500 px-4 py-1 text-xs font-medium text-white hover:bg-purple-600 disabled:opacity-50"
                >
                  {running ? "Running…" : "▶ Run"}
                </button>
              )}
              {canEdit && (
                <span className="ml-auto text-xs text-purple-300">double-click to edit</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Loop body ────────────────────────────────────────────────────── */}
      <div className="bg-white border-l-4 border-purple-200 ml-4 pl-3 pr-4 py-3 flex flex-col gap-2">
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
            onRawChange={updateChildRaw}
            onRemove={removeChild}
          />
        ))}

        {canEdit && (
          <button
            onClick={addChild}
            className="mt-1 self-start rounded border border-dashed border-purple-300 px-3 py-1.5 text-xs text-purple-600 hover:border-purple-400 hover:bg-purple-50"
          >
            + Add equation
          </button>
        )}

        {runError && (
          <div className="mt-2 text-xs text-red-500">Run error: {runError}</div>
        )}
        {loopResult && (
          <WhileResultsTable result={loopResult} children={children} />
        )}
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div className="bg-purple-50 border-t border-purple-200 px-4 py-1 flex items-center justify-between">
        <span className="font-mono text-xs text-purple-400">end while</span>
        {hasFinalValues && !loopResult && (
          <span className="text-xs text-purple-300">
            {Object.keys(def.finalValues!).filter((k) => !k.startsWith("_")).length} variable
            {Object.keys(def.finalValues!).filter((k) => !k.startsWith("_")).length !== 1 ? "s" : ""} exported
          </span>
        )}
      </div>
    </div>
  );
}

// ── Results table ──────────────────────────────────────────────────────────────

const MAX_ROWS_SHOWN = 50;

interface WhileResultsTableProps {
  result: SolveWhileLoopResult;
  children: VirtualBlock[];
}

function WhileResultsTable({ result, children }: WhileResultsTableProps) {
  const [expanded, setExpanded] = useState(false);
  const { iterations, terminatedByLimit, finalValues } = result;

  const cols = children.map((c) => {
    const firstRow = iterations[0];
    const cell = firstRow?.childResults.find((r) => r.blockId === c.id);
    return { id: c.id, label: cell?.variableName || (c.definition as { raw?: string }).raw || c.id };
  });

  const visibleRows = expanded ? iterations : iterations.slice(0, MAX_ROWS_SHOWN);
  const truncated = !expanded && iterations.length > MAX_ROWS_SHOWN;

  const fmtCell = (iter: WhileIterationResult, childId: string) => {
    const r = iter.childResults.find((cr) => cr.blockId === childId);
    if (!r) return "—";
    if (r.errors.length > 0) return <span className="text-red-400" title={r.errors[0]}>err</span>;
    if (!r.solution) return "—";
    const val = r.solution.real["0-0"];
    if (val === undefined) return "—";
    const v = parseFloat(val.toPrecision(6)).toString();
    return r.solution.units ? `${v} ${r.solution.units}` : v;
  };

  const exportedVars = Object.entries(finalValues).filter(([k]) => !k.startsWith("_"));

  return (
    <div className="mt-3 overflow-x-auto rounded border border-purple-100" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between px-3 py-1.5 bg-purple-50 border-b border-purple-100">
        <span className="text-xs font-medium text-purple-700">
          Results — {iterations.length} iteration{iterations.length !== 1 ? "s" : ""}
          {terminatedByLimit && <span className="ml-2 text-orange-500">(limit reached)</span>}
        </span>
      </div>

      {iterations.length > 0 ? (
        <>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-gray-500">
                <th className="px-3 py-1.5 text-left font-mono font-medium border-r border-gray-100">#</th>
                {cols.map((col) => (
                  <th key={col.id} className="px-3 py-1.5 text-left font-mono font-medium border-r border-gray-100 last:border-r-0">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((iter, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                  <td className="px-3 py-1 font-mono text-purple-700 border-r border-gray-100">{iter.iteration}</td>
                  {cols.map((col) => (
                    <td key={col.id} className="px-3 py-1 font-mono text-gray-700 border-r border-gray-100 last:border-r-0">
                      {fmtCell(iter, col.id)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {truncated && (
            <button
              onClick={() => setExpanded(true)}
              className="w-full py-1.5 text-xs text-purple-500 hover:text-purple-700 hover:bg-purple-50 border-t border-purple-100"
            >
              Show all {iterations.length} rows…
            </button>
          )}
        </>
      ) : (
        <div className="px-3 py-2 text-xs text-gray-400 italic">
          Condition was false on first check — zero iterations ran.
        </div>
      )}

      {exportedVars.length > 0 && (
        <div className="border-t border-purple-100 bg-purple-50/60 px-3 py-2">
          <div className="text-xs font-medium text-purple-700 mb-1">Final values (available to equations below)</div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {exportedVars.map(([varName, val]) => (
              <span key={varName} className="font-mono text-xs text-gray-700">
                {varName} = {parseFloat(val.toPrecision(6)).toString()}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Child equation block ───────────────────────────────────────────────────────

interface ChildProps {
  child: VirtualBlock;
  canEdit: boolean;
  onRawChange: (id: string, raw: string) => void;
  onRemove: (id: string) => void;
}

function ChildEquationBlock({ child, canEdit, onRawChange, onRemove }: ChildProps) {
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
          placeholder="variable = expression"
        />
        <div className="mt-1.5 flex gap-2">
          <button onClick={save} className="rounded bg-blue-600 px-2 py-0.5 text-xs text-white hover:bg-blue-700">Save</button>
          <button onClick={cancel} className="rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-50">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group flex items-center justify-between rounded border border-gray-100 bg-gray-50 px-3 py-1.5 hover:border-gray-200"
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (canEdit) { setDraft(def.raw ?? ""); setEditing(true); }
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
