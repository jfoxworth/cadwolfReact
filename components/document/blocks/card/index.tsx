"use client";

import { useState, useEffect } from "react";
import type { VirtualBlock } from "@/types/document";
import type { SolveResult } from "@/solver/types";
import KatexSpan from "@/components/ui/KatexSpan";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface CardDef {
  equationBlockId: string | null;
  width: string;
}

export interface EquationOption {
  id: string;
  variableName: string;
  order: number;
}

interface Props {
  block: VirtualBlock;
  canEdit?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string | null) => void;
  onDefinitionChange?: (blockId: string, newDef: Record<string, unknown>) => void;
  solverResults?: Map<string, SolveResult>;
  equationOptions?: EquationOption[];
}

// Same threshold logic as the equation block.
function autoShowMatrix(size: string): boolean {
  const [rows, cols] = size.split("x").map(Number);
  const total = rows * cols;
  const isVector = rows === 1 || cols === 1;
  return isVector ? total <= 10 : total <= 100;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CardBlock({
  block,
  canEdit,
  isSelected,
  onSelect,
  onDefinitionChange,
  solverResults,
  equationOptions = [],
}: Props) {
  const def = block.definition as Partial<CardDef>;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(def.equationBlockId ?? "");

  useEffect(() => { if (!isSelected) setEditing(false); }, [isSelected]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedId = def.equationBlockId ?? null;
  const result = selectedId ? solverResults?.get(selectedId) : undefined;

  // Separate name and value for the two-column display.
  let variableName: string | null = null;
  let valueTex: string | null = null;

  if (result && result.errors.length === 0 && result.solution) {
    variableName = result.variableName;
    const matrixSize = result.display.matrixSize;
    if (!matrixSize) {
      valueTex = result.display.solution ?? "";
    } else {
      const show = autoShowMatrix(matrixSize);
      valueTex = show ? result.display.solution : `\\text{[${matrixSize}]}`;
    }
  }

  const handleSave = () => {
    setEditing(false);
    onDefinitionChange?.(block.id, {
      ...block.definition,
      equationBlockId: draft || null,
    });
  };

  const handleCancel = () => {
    setEditing(false);
    setDraft(def.equationBlockId ?? "");
  };

  // ── Edit mode ─────────────────────────────────────────────────────────────

  if (editing) {
    return (
      <div
        className="rounded-lg border-2 border-blue-400 bg-blue-50 p-3"
        onClick={(e) => e.stopPropagation()}
      >
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Select equation to display
        </label>
        <select
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          <option value="">— select an equation —</option>
          {equationOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.variableName || opt.id}
            </option>
          ))}
        </select>
        <div className="mt-2 flex gap-2">
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
    );
  }

  // ── View mode ─────────────────────────────────────────────────────────────

  const containerClass = [
    "rounded-lg border-2 overflow-hidden",
    isSelected
      ? "border-blue-400"
      : "border-gray-200 hover:border-gray-300",
    canEdit ? "cursor-pointer" : "",
  ]
    .filter(Boolean)
    .join(" ");

  // No equation selected or not yet solved — show placeholder
  if (!variableName || !valueTex) {
    return (
      <div
        onClick={() => onSelect?.(block.id)}
        onDoubleClick={() => {
          if (canEdit) { setDraft(def.equationBlockId ?? ""); setEditing(true); }
        }}
        className={`${containerClass} flex items-center justify-center px-6 py-5 min-h-[72px] bg-gray-50`}
      >
        {result && result.errors.length > 0 ? (
          <span className="text-sm text-red-500" title={result.errors.join("\n")}>
            {result.errors[0]}
          </span>
        ) : selectedId && !result ? (
          <span className="text-sm text-gray-400 italic">Not yet solved</span>
        ) : (
          <span className="text-sm text-gray-400 italic">
            {canEdit ? "double-click to select an equation" : "no equation selected"}
          </span>
        )}
      </div>
    );
  }

  // Two-column card: Name | Value
  return (
    <div
      onClick={() => onSelect?.(block.id)}
      onDoubleClick={() => {
        if (canEdit) { setDraft(def.equationBlockId ?? ""); setEditing(true); }
      }}
      className={containerClass}
    >
      {/* Column headers */}
      <div className="flex divide-x divide-gray-200 bg-gray-100 border-b border-gray-200">
        <div className="flex-1 px-4 py-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            Name
          </span>
        </div>
        <div className="flex-1 px-4 py-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            Value
          </span>
        </div>
      </div>

      {/* Content row */}
      <div className="flex divide-x divide-gray-200 bg-white">
        <div className="flex-1 px-4 py-3 flex items-center">
          <span className="font-mono text-base text-gray-800">{variableName}</span>
        </div>
        <div className="flex-1 px-4 py-3 flex items-center">
          <KatexSpan tex={valueTex} />
        </div>
      </div>
    </div>
  );
}
