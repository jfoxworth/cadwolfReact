"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import type { VirtualBlock } from "@/types/document";
import type { SolveResult } from "@/solver/types";
import type {
  SolveIfElseMessage,
  SolveIfElseResult,
  WorkerOutput,
} from "@/solver/worker/worker-types";
import { rawToLatex } from "@/utils/rawToLatex";
import KatexSpan from "@/components/ui/KatexSpan";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ConditionDef {
  flagText: string;
  conditionText: "==" | "!=" | ">" | ">=" | "<" | "<=";
  dependentText: string;
  blockOption: "&&" | "||";
}

export interface BranchDef {
  id: string;
  type: "if" | "elseif" | "else";
  conditions: ConditionDef[];
  children: VirtualBlock[];
}

export interface IfElseDef {
  branches: BranchDef[];
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

const OPERATORS: ConditionDef["conditionText"][] = ["==", "!=", ">", ">=", "<", "<="];

function defaultCondition(): ConditionDef {
  return { flagText: "", conditionText: "==", dependentText: "", blockOption: "&&" };
}

function defaultBranch(type: BranchDef["type"]): BranchDef {
  return {
    id: crypto.randomUUID(),
    type,
    conditions: type === "else" ? [] : [defaultCondition()],
    children: [],
  };
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function IfElseBlock({
  block,
  canEdit,
  isSelected,
  onSelect,
  onDefinitionChange,
  solverResults,
}: Props) {
  const rawDef = block.definition as Partial<IfElseDef>;
  const def: IfElseDef = {
    branches: rawDef.branches?.length
      ? rawDef.branches
      : [defaultBranch("if")],
  };

  const workerRef = useRef<Worker | null>(null);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<{ activeBranchIndex: number; childResults: SolveResult[] } | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  useEffect(() => () => { workerRef.current?.terminate(); }, []);

  // ── Editing state ────────────────────────────────────────────────────────────

  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [draftBranches, setDraftBranches] = useState<BranchDef[]>(def.branches);

  useEffect(() => { if (!isSelected) setEditingBranchId(null); }, [isSelected]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep draft in sync with external changes
  useEffect(() => {
    if (!editingBranchId) setDraftBranches(def.branches);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.definition]);

  const startEdit = useCallback(
    (branchId: string) => {
      if (!canEdit) return;
      setDraftBranches(def.branches.map((b) => ({ ...b, conditions: [...b.conditions] })));
      setEditingBranchId(branchId);
    },
    [canEdit, def.branches],
  );

  const cancelEdit = useCallback(() => {
    setEditingBranchId(null);
    setDraftBranches(def.branches);
  }, [def.branches]);

  const saveEdit = useCallback(() => {
    setEditingBranchId(null);
    onDefinitionChange?.(block.id, { ...block.definition, branches: draftBranches });
  }, [block.id, block.definition, draftBranches, onDefinitionChange]);

  // ── Draft mutations ──────────────────────────────────────────────────────────

  const updateCondition = (
    branchId: string,
    condIdx: number,
    patch: Partial<ConditionDef>,
  ) => {
    setDraftBranches((prev) =>
      prev.map((b) =>
        b.id !== branchId
          ? b
          : {
              ...b,
              conditions: b.conditions.map((c, i) =>
                i === condIdx ? { ...c, ...patch } : c,
              ),
            },
      ),
    );
  };

  const addCondition = (branchId: string) => {
    setDraftBranches((prev) =>
      prev.map((b) =>
        b.id !== branchId
          ? b
          : { ...b, conditions: [...b.conditions, defaultCondition()] },
      ),
    );
  };

  const removeCondition = (branchId: string, condIdx: number) => {
    setDraftBranches((prev) =>
      prev.map((b) =>
        b.id !== branchId
          ? b
          : { ...b, conditions: b.conditions.filter((_, i) => i !== condIdx) },
      ),
    );
  };

  // ── Branch management ────────────────────────────────────────────────────────

  const addElseIf = useCallback(() => {
    const branches = def.branches;
    const elseIdx = branches.findIndex((b) => b.type === "else");
    const newBranch = defaultBranch("elseif");
    const updated =
      elseIdx >= 0
        ? [...branches.slice(0, elseIdx), newBranch, ...branches.slice(elseIdx)]
        : [...branches, newBranch];
    onDefinitionChange?.(block.id, { ...block.definition, branches: updated });
  }, [block.id, block.definition, def.branches, onDefinitionChange]);

  const addElse = useCallback(() => {
    if (def.branches.some((b) => b.type === "else")) return;
    onDefinitionChange?.(block.id, {
      ...block.definition,
      branches: [...def.branches, defaultBranch("else")],
    });
  }, [block.id, block.definition, def.branches, onDefinitionChange]);

  const removeBranch = useCallback(
    (branchId: string) => {
      const updated = def.branches.filter((b) => b.id !== branchId);
      if (updated.length === 0) return; // always keep at least "if"
      onDefinitionChange?.(block.id, { ...block.definition, branches: updated });
    },
    [block.id, block.definition, def.branches, onDefinitionChange],
  );

  // ── Child management ─────────────────────────────────────────────────────────

  const addChild = useCallback(
    (branchId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const newChild: VirtualBlock = {
        id: `child-${crypto.randomUUID()}`,
        refId: "",
        type: "EQUATION",
        order: 0,
        definition: { raw: "" },
        _status: "new",
      };
      const updated = def.branches.map((b) =>
        b.id !== branchId
          ? b
          : { ...b, children: [...b.children, { ...newChild, order: b.children.length }] },
      );
      onDefinitionChange?.(block.id, { ...block.definition, branches: updated });
    },
    [block.id, block.definition, def.branches, onDefinitionChange],
  );

  const updateChildRaw = useCallback(
    (branchId: string, childId: string, raw: string) => {
      const updated = def.branches.map((b) =>
        b.id !== branchId
          ? b
          : {
              ...b,
              children: b.children.map((c) =>
                c.id === childId ? { ...c, definition: { ...c.definition, raw } } : c,
              ),
            },
      );
      onDefinitionChange?.(block.id, { ...block.definition, branches: updated });
    },
    [block.id, block.definition, def.branches, onDefinitionChange],
  );

  const removeChild = useCallback(
    (branchId: string, childId: string) => {
      const updated = def.branches.map((b) =>
        b.id !== branchId
          ? b
          : { ...b, children: b.children.filter((c) => c.id !== childId) },
      );
      onDefinitionChange?.(block.id, { ...block.definition, branches: updated });
    },
    [block.id, block.definition, def.branches, onDefinitionChange],
  );

  // ── Run ──────────────────────────────────────────────────────────────────────

  const handleRun = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setRunning(true);
      setRunResult(null);
      setRunError(null);

      if (!workerRef.current) {
        workerRef.current = new Worker(
          new URL("@/solver/worker/worker.ts", import.meta.url),
        );
      }

      workerRef.current.onmessage = (ev: MessageEvent<WorkerOutput>) => {
        const msg = ev.data;
        if (msg.type === "SOLVE_IF_ELSE_RESULT") {
          const result = (msg as SolveIfElseResult).result;
          setRunResult(result);
          setRunning(false);
          // Extract scalar final values from the active branch's child results
          // and store them so downstream equations can reference them.
          const finalValues: Record<string, number> = {};
          if (result.activeBranchIndex >= 0) {
            for (const r of result.childResults) {
              if (r.variableName && r.solution && r.solution.size === "1x1" && r.errors.length === 0) {
                const val = (r.solution.real["0-0"] ?? 0) * r.solution.multiplier;
                if (!r.variableName.startsWith("_")) finalValues[r.variableName] = val;
              }
            }
          }
          onDefinitionChange?.(block.id, { ...block.definition, finalValues });
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

      const payload: SolveIfElseMessage = {
        type: "SOLVE_IF_ELSE",
        blockOrder: block.order,
        parentContext,
        branches: def.branches.map((b) => ({
          type: b.type,
          conditions: b.conditions,
          childBlocks: b.children.map((c, i) => ({
            id: c.id,
            order: i + 1,
            type: "EQUATION",
            definition: c.definition as { raw?: string },
          })),
        })),
      };
      workerRef.current.postMessage(payload);
    },
    [block.id, block.order, block.definition, def.branches, solverResults, onDefinitionChange],
  );

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const conditionLabel = (conditions: ConditionDef[]) =>
    conditions
      .map(
        (c, i) =>
          `${i > 0 ? ` ${conditions[i - 1].blockOption} ` : ""}${c.flagText || "?"} ${c.conditionText} ${c.dependentText || "?"}`,
      )
      .join("");

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div
      onClick={() => onSelect?.(block.id)}
      className={[
        "rounded-lg border-2 overflow-hidden select-none",
        isSelected ? "border-violet-400" : "border-violet-300",
        canEdit ? "cursor-pointer" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {def.branches.map((branch, branchIdx) => {
        const isActiveBranch = runResult?.activeBranchIndex === branchIdx;
        const isEditing = editingBranchId === branch.id;
        const childResultMap = new Map(runResult?.childResults.map((r) => [r.blockId, r]));

        return (
          <div key={branch.id}>
            {/* ── Branch header ────────────────────────────────────────── */}
            <div
              className={[
                "px-4 py-3 border-b",
                branchIdx === 0 ? "" : "border-t border-violet-100",
                isActiveBranch
                  ? "bg-green-50 border-green-200"
                  : "bg-violet-50 border-violet-200",
              ].join(" ")}
            >
              {isEditing ? (
                /* ── Edit mode ─────────────────────────────────────────── */
                <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-violet-700 font-bold font-mono text-sm">
                      {branch.type === "if" ? "if" : branch.type === "elseif" ? "else if" : "else"}
                    </span>

                    {branch.type !== "else" &&
                      branch.conditions.map((cond, condIdx) => (
                        <div key={condIdx} className="flex items-center gap-1 flex-wrap">
                          {condIdx > 0 && (
                            <select
                              value={branch.conditions[condIdx - 1].blockOption}
                              onChange={(e) =>
                                updateCondition(branch.id, condIdx - 1, {
                                  blockOption: e.target.value as "&&" | "||",
                                })
                              }
                              className="rounded border border-violet-300 px-1 py-0.5 text-xs font-mono"
                            >
                              <option value="&&">&&</option>
                              <option value="||">||</option>
                            </select>
                          )}
                          <input
                            type="text"
                            value={cond.flagText}
                            onChange={(e) =>
                              updateCondition(branch.id, condIdx, { flagText: e.target.value })
                            }
                            placeholder="expr"
                            className="w-24 rounded border border-violet-300 px-2 py-0.5 text-xs font-mono focus:border-blue-400 focus:outline-none"
                          />
                          <select
                            value={cond.conditionText}
                            onChange={(e) =>
                              updateCondition(branch.id, condIdx, {
                                conditionText: e.target.value as ConditionDef["conditionText"],
                              })
                            }
                            className="rounded border border-violet-300 px-1 py-0.5 text-xs font-mono"
                          >
                            {OPERATORS.map((op) => (
                              <option key={op} value={op}>{op}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={cond.dependentText}
                            onChange={(e) =>
                              updateCondition(branch.id, condIdx, { dependentText: e.target.value })
                            }
                            placeholder="expr"
                            className="w-24 rounded border border-violet-300 px-2 py-0.5 text-xs font-mono focus:border-blue-400 focus:outline-none"
                          />
                          {branch.conditions.length > 1 && (
                            <button
                              onClick={() => removeCondition(branch.id, condIdx)}
                              className="text-red-400 hover:text-red-600 text-xs"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}

                    {branch.type !== "else" && (
                      <button
                        onClick={() => addCondition(branch.id)}
                        className="text-xs text-violet-500 hover:text-violet-700 border border-dashed border-violet-300 px-2 py-0.5 rounded"
                      >
                        + and/or
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={saveEdit}
                      className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    {branch.type !== "if" && (
                      <button
                        onClick={() => { cancelEdit(); removeBranch(branch.id); }}
                        className="ml-auto rounded border border-red-200 px-3 py-1 text-xs text-red-500 hover:bg-red-50"
                      >
                        Remove branch
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* ── View mode ─────────────────────────────────────────── */
                <div
                  className="flex items-center gap-2 font-mono text-sm"
                  onDoubleClick={() => startEdit(branch.id)}
                >
                  <span className="text-violet-700 font-bold">
                    {branch.type === "if" ? "if" : branch.type === "elseif" ? "else if" : "else"}
                  </span>
                  {branch.type !== "else" && (
                    <span className="text-violet-900">
                      ({conditionLabel(branch.conditions)})
                    </span>
                  )}
                  {isActiveBranch && (
                    <span className="ml-auto rounded bg-green-100 border border-green-300 px-2 py-0.5 text-xs text-green-700 font-sans font-medium">
                      active ✓
                    </span>
                  )}
                  {canEdit && !isEditing && (
                    <span className="ml-auto text-xs text-violet-300 font-sans">double-click to edit</span>
                  )}
                </div>
              )}
            </div>

            {/* ── Branch body ──────────────────────────────────────────── */}
            <div className="bg-white border-l-4 border-violet-200 ml-4 pl-3 pr-4 py-3 flex flex-col gap-2">
              {branch.children.length === 0 && (
                <p className="text-xs text-gray-400 italic py-1">No equations in this branch.</p>
              )}
              {branch.children.map((child) => (
                <ChildEquationBlock
                  key={child.id}
                  child={child}
                  canEdit={!!canEdit}
                  solveResult={childResultMap.get(child.id) ?? null}
                  onRawChange={(raw) => updateChildRaw(branch.id, child.id, raw)}
                  onRemove={() => removeChild(branch.id, child.id)}
                />
              ))}
              {canEdit && (
                <button
                  onClick={(e) => addChild(branch.id, e)}
                  className="mt-1 self-start rounded border border-dashed border-violet-300 px-3 py-1.5 text-xs text-violet-600 hover:border-violet-400 hover:bg-violet-50"
                >
                  + Add equation
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* ── Footer / actions ───────────────────────────────────────────────── */}
      <div className="bg-violet-50 border-t border-violet-200 px-4 py-2 flex items-center gap-3">
        <span className="font-mono text-xs text-violet-400">end if</span>

        {canEdit && !def.branches.some((b) => b.type === "elseif" || b.type === "else") && (
          <button
            onClick={(e) => { e.stopPropagation(); addElseIf(); }}
            className="rounded border border-violet-200 px-2 py-0.5 text-xs text-violet-600 hover:bg-violet-100"
          >
            + else if
          </button>
        )}
        {canEdit && def.branches.some((b) => b.type === "elseif") && !def.branches.some((b) => b.type === "else") && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); addElseIf(); }}
              className="rounded border border-violet-200 px-2 py-0.5 text-xs text-violet-600 hover:bg-violet-100"
            >
              + else if
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); addElse(); }}
              className="rounded border border-violet-200 px-2 py-0.5 text-xs text-violet-600 hover:bg-violet-100"
            >
              + else
            </button>
          </>
        )}
        {canEdit && !def.branches.some((b) => b.type === "else") && def.branches.every((b) => b.type === "if") && (
          <button
            onClick={(e) => { e.stopPropagation(); addElse(); }}
            className="rounded border border-violet-200 px-2 py-0.5 text-xs text-violet-600 hover:bg-violet-100"
          >
            + else
          </button>
        )}

        <button
          onClick={handleRun}
          disabled={running}
          className="ml-auto rounded bg-violet-500 px-4 py-1 text-xs font-medium text-white hover:bg-violet-600 disabled:opacity-50"
        >
          {running ? "Running…" : "▶ Evaluate"}
        </button>
      </div>

      {runError && (
        <div className="px-4 py-2 text-xs text-red-500 bg-red-50 border-t border-red-100">
          Error: {runError}
        </div>
      )}
      {runResult && runResult.activeBranchIndex === -1 && (
        <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50 border-t border-gray-100">
          No branch matched.
        </div>
      )}
      {(() => {
        const finalValues = (block.definition as Partial<IfElseDef>).finalValues;
        const exportedVars = finalValues ? Object.entries(finalValues).filter(([k]) => !k.startsWith("_")) : [];
        if (exportedVars.length === 0) return null;
        return (
          <div className="border-t border-violet-100 bg-violet-50/60 px-3 py-2">
            <div className="text-xs font-medium text-violet-700 mb-1">Final values (available to equations below)</div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {exportedVars.map(([varName, val]) => (
                <span key={varName} className="font-mono text-xs text-gray-700">
                  {varName} = {parseFloat(val.toPrecision(6)).toString()}
                </span>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Child equation block ───────────────────────────────────────────────────────

interface ChildProps {
  child: VirtualBlock;
  canEdit: boolean;
  solveResult: SolveResult | null;
  onRawChange: (raw: string) => void;
  onRemove: () => void;
}

function ChildEquationBlock({ child, canEdit, solveResult, onRawChange, onRemove }: ChildProps) {
  const def = child.definition as { raw?: string };
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(def.raw ?? "");

  useEffect(() => {
    if (!editing) setDraft(def.raw ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def.raw]);

  const save = () => {
    setEditing(false);
    if (draft.trim() !== (def.raw ?? "")) onRawChange(draft.trim());
  };

  const cancel = () => { setEditing(false); setDraft(def.raw ?? ""); };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); save(); }
    if (e.key === "Escape") cancel();
  };

  const resultDisplay = solveResult
    ? solveResult.errors.length > 0
      ? <span className="text-red-500 text-xs">{solveResult.errors[0]}</span>
      : solveResult.solution
        ? <span className="text-green-700 text-xs font-mono">
            = {parseFloat((solveResult.solution.real["0-0"] ?? 0).toPrecision(6)).toString()}
            {solveResult.solution.units ? ` ${solveResult.solution.units}` : ""}
          </span>
        : null
    : null;

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
      onDoubleClick={(e) => { e.stopPropagation(); if (canEdit) { setDraft(def.raw ?? ""); setEditing(true); } }}
    >
      <div className="flex-1 min-w-0 flex items-center gap-3">
        {def.raw ? (
          <KatexSpan tex={rawToLatex(def.raw)} />
        ) : (
          <span className="text-xs text-gray-400 italic">{canEdit ? "double-click to add equation" : "empty"}</span>
        )}
        {resultDisplay}
      </div>
      {canEdit && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="ml-2 shrink-0 text-sm text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-600 leading-none"
        >
          ×
        </button>
      )}
    </div>
  );
}
