"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type { Block } from "@/types/document";
import type { SolveResult } from "@/solver/types";
import KatexSpan from "@/components/ui/KatexSpan";
import { rawToLatex } from "@/utils/rawToLatex";
import { RefreshCw } from "lucide-react";

/** Returns parsed parts if `raw` is a plain numeric assignment like `a = 5` or `b = -3.14 kg`. */
function parsePlainNumber(raw: string): { lhs: string; value: number; unit: string } | null {
  const m = raw.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s*(\S*)\s*$/);
  if (!m) return null;
  return { lhs: m[1], value: parseFloat(m[2]), unit: m[3] };
}

export type ModelView = "equation" | "numerical" | "units" | "dimensions" | "quantity";

interface EquationBlockProps {
  block: Block;
  result?: SolveResult;
  canEdit?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string | null) => void;
  /** Called when the user saves a new raw equation. Receives blockId, new raw string, and new LaTeX. */
  onRawChange?: (blockId: string, newRaw: string, newDisplayEq: string) => void;
  /** Called in viewer mode when the user changes a plain-number RHS — does NOT mark block dirty. */
  onViewerRawChange?: (blockId: string, newRaw: string, newDisplayEq: string) => void;
  /** Called to persist definition changes (e.g. displayOptions). */
  onDefinitionChange?: (blockId: string, newDef: Record<string, unknown>) => void;
  /** Called to manually re-run the solver for this block. */
  onResolve?: (blockId: string) => void;
  /** True while the worker is actively solving this block. */
  isSolving?: boolean;
  /** Which model to display instead of the default equation (resets on page load). */
  modelView?: ModelView;
}

type ShowMatrix = boolean | undefined; // true = always show, false = always hide, undefined = auto

/** Given a matrixSize string, determine the auto-default for showMatrix. */
function autoShowMatrix(size: string): boolean {
  const [rows, cols] = size.split("x").map(Number);
  const total = rows * cols;
  const isVector = rows === 1 || cols === 1;
  return isVector ? total <= 10 : total <= 100;
}

export default function EquationBlock({
  block,
  result,
  canEdit = false,
  isSelected = false,
  onSelect,
  onRawChange,
  onViewerRawChange,
  onDefinitionChange,
  onResolve,
  isSolving = false,
  modelView,
}: EquationBlockProps) {
  const def = block.definition as {
    raw?: string;
    displayEq?: string;
    displayOptions?: { showMatrix?: boolean };
  };

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(def.raw ?? "");

  useEffect(() => { if (!isSelected) setEditing(false); }, [isSelected]); // eslint-disable-line react-hooks/exhaustive-deps

  // Full LaTeX string saved to DB — shown as-is until the solver overwrites it
  const storedDisplay = (block.solution as { display?: string } | undefined)?.display ?? "";

  // Local displayEq — starts from stored value, updated when solver returns
  const [displayEq, setDisplayEq] = useState<string>(
    def.displayEq ?? rawToLatex(def.raw ?? ""),
  );
  // Solution portion of the display (RHS); empty until solver runs
  const [solutionTex, setSolutionTex] = useState<string>("");
  const storedErrors = (block.solution as { errors?: string[] } | undefined)?.errors ?? [];
  const [errors, setErrors] = useState<string[]>(storedErrors);

  // Viewer-mode: local numeric value for plain-number equations
  const plainNum = useMemo(() => parsePlainNumber(def.raw ?? ""), [def.raw]);
  const [viewerValue, setViewerValue] = useState<string>(
    plainNum ? String(plainNum.value) : "",
  );

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync solver results into local state
  useEffect(() => {
    if (!result) return;
    if (result.display.equation) setDisplayEq(result.display.equation);
    setErrors(result.errors);

    const matrixSize = result.display.matrixSize;

    if (!matrixSize) {
      // Scalar result
      setSolutionTex(result.display.solution ?? "");
      return;
    }

    // Non-scalar: determine showMatrix preference
    const storedPref = def.displayOptions?.showMatrix;

    if (storedPref === undefined) {
      // Auto-set based on size and save it so it persists
      const autoVal = autoShowMatrix(matrixSize);
      onDefinitionChange?.(block.id, {
        ...block.definition,
        displayOptions: { ...(def.displayOptions ?? {}), showMatrix: autoVal },
      });
      setSolutionTex(
        autoVal ? result.display.solution : `\\text{[${matrixSize}]}`,
      );
    } else {
      setSolutionTex(
        storedPref ? result.display.solution : `\\text{[${matrixSize}]}`,
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  // Focus textarea when edit mode starts
  useEffect(() => {
    if (editing) {
      textareaRef.current?.focus();
      textareaRef.current?.select();
    }
  }, [editing]);

  const handleClick = useCallback(() => {
    if (onSelect) onSelect(block.id);
  }, [onSelect, block.id]);

  const handleDoubleClick = useCallback(() => {
    if (!canEdit) return;
    setDraft(def.raw ?? "");
    setEditing(true);
  }, [canEdit, def.raw]);

  const handleSave = useCallback(() => {
    setEditing(false);
    const trimmed = draft.trim();
    if (!trimmed || trimmed === def.raw) return;

    const newDisplayEq = rawToLatex(trimmed);
    setDisplayEq(newDisplayEq);
    setSolutionTex("");
    setErrors([]);

    if (onRawChange) onRawChange(block.id, trimmed, newDisplayEq);
  }, [draft, def.raw, block.id, onRawChange]);

  const handleCancel = useCallback(() => {
    setEditing(false);
    setDraft(def.raw ?? "");
  }, [def.raw]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSave();
      }
      if (e.key === "Escape") handleCancel();
    },
    [handleSave, handleCancel],
  );

  function handleShowMatrixChange(val: string) {
    const newPref: ShowMatrix =
      val === "true" ? true : val === "false" ? false : undefined;
    onDefinitionChange?.(block.id, {
      ...block.definition,
      displayOptions: { ...(def.displayOptions ?? {}), showMatrix: newPref },
    });

    // Apply immediately to local state
    if (result?.display.matrixSize) {
      const effective =
        newPref === undefined
          ? autoShowMatrix(result.display.matrixSize)
          : newPref;
      setSolutionTex(
        effective
          ? result.display.solution
          : `\\text{[${result.display.matrixSize}]}`,
      );
    }
  }

  // ── Edit mode ─────────────────────────────────────────────────────────────
  if (editing) {
    const currentShowMatrix = def.displayOptions?.showMatrix;
    const showMatrixSelectVal =
      currentShowMatrix === true ? "true" : currentShowMatrix === false ? "false" : "auto";
    const hasMatrix = !!result?.display.matrixSize;

    return (
      <div className="rounded-md border border-blue-400 bg-blue-50 p-3">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          className="w-full resize-none rounded border-0 bg-transparent font-mono text-sm text-gray-900 focus:outline-none"
          placeholder="variableName = expression"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
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

          {hasMatrix && (
            <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-500">
              <label className="font-medium">Matrix display:</label>
              <select
                value={showMatrixSelectVal}
                onChange={(e) => handleShowMatrixChange(e.target.value)}
                className="rounded border border-gray-300 bg-white px-2 py-0.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
              >
                <option value="auto">Auto</option>
                <option value="true">Show values</option>
                <option value="false">Show size</option>
              </select>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Viewer-mode plain-number input ────────────────────────────────────────
  // When not editing, not in edit mode, but the equation is a plain numeric
  // assignment (e.g. `a = 5 m`), show an inline editable number input so
  // viewers can change the value and see downstream results update.
  if (!canEdit && plainNum && onViewerRawChange) {
    const handleViewerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setViewerValue(e.target.value);
    };
    const commitViewerChange = () => {
      const parsed = parseFloat(viewerValue);
      if (isNaN(parsed)) { setViewerValue(String(plainNum.value)); return; }
      const newRaw = `${plainNum.lhs} = ${parsed}${plainNum.unit ? ` ${plainNum.unit}` : ""}`;
      const newDisplayEq = rawToLatex(newRaw);
      onViewerRawChange(block.id, newRaw, newDisplayEq);
    };
    const handleViewerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") commitViewerChange();
    };

    return (
      <div
        onClick={handleClick}
        className={[
          "flex items-center justify-center gap-2 rounded px-2 py-2",
          isSelected ? "bg-blue-50 ring-1 ring-blue-300" : "hover:bg-gray-50",
        ].join(" ")}
      >
        <KatexSpan tex={`${plainNum.lhs} =`} />
        <input
          type="number"
          value={viewerValue}
          onChange={handleViewerChange}
          onBlur={commitViewerChange}
          onKeyDown={handleViewerKeyDown}
          onClick={(e) => e.stopPropagation()}
          className="w-24 rounded border border-gray-300 px-2 py-0.5 text-center font-mono text-sm focus:border-blue-400 focus:outline-none"
        />
        {plainNum.unit && <KatexSpan tex={`\\text{${plainNum.unit}}`} />}
      </div>
    );
  }

  // ── View mode ──────────────────────────────────────────────────────────────
  // When a model view is active, replace the equation with the model string rendered via rawToLatex
  const lhs = (def.raw ?? "").split("=")[0].trim();
  const modelDisplay = (() => {
    if (!modelView || modelView === "equation") return null;
    const modelStrings: Record<string, string | undefined> = {
      numerical:  result?.display.numericalModel,
      units:      result?.display.unitsModel,
      dimensions: result?.display.dimensionsModel,
      quantity:   result?.display.quantitiesModel,
    };
    const rhs = modelStrings[modelView];
    if (!rhs) return null;
    return rawToLatex(`${lhs} = ${rhs}`);
  })();

  // Show stored DB display until the solver sets solutionTex
  const combinedTex = modelDisplay
    ?? (solutionTex ? `${displayEq} = ${solutionTex}` : (storedDisplay || displayEq));

  return (
    <div
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className={[
        "relative flex flex-col items-center rounded px-2 py-2 group",
        isSelected ? "bg-blue-50 ring-1 ring-blue-300" : isSolving ? "bg-gray-100" : "hover:bg-gray-50",
        canEdit ? "cursor-pointer" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {onResolve && (
        <button
          onClick={(e) => { e.stopPropagation(); onResolve(block.id); }}
          title="Re-solve this equation"
          className="absolute top-1 right-6 p-0.5 rounded text-gray-300 hover:text-blue-500 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <RefreshCw size={12} />
        </button>
      )}
      {errors.length > 0 ? (
        <span className="text-sm text-red-500" title={errors.join("\n")}>
          {errors[0]}
        </span>
      ) : (
        <KatexSpan tex={combinedTex} />
      )}
    </div>
  );
}
