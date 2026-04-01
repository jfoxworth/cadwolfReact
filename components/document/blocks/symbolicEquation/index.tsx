"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Block } from "@/types/document";
import KatexSpan from "@/components/ui/KatexSpan";

interface SymbolicEquationBlockProps {
  block: Block;
  canEdit?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string | null) => void;
  onDefinitionChange?: (blockId: string, newDef: Record<string, unknown>) => void;
}

export default function SymbolicEquationBlock({
  block,
  canEdit = false,
  isSelected = false,
  onSelect,
  onDefinitionChange,
}: SymbolicEquationBlockProps) {
  const def = block.definition as { expression?: string };
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(def.expression ?? "");
  const [expression, setExpression] = useState(def.expression ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!isSelected) setEditing(false); }, [isSelected]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const handleClick = useCallback(() => {
    if (onSelect) onSelect(block.id);
  }, [onSelect, block.id]);

  const handleDoubleClick = useCallback(() => {
    if (!canEdit) return;
    setDraft(expression);
    setEditing(true);
  }, [canEdit, expression]);

  const handleSave = useCallback(() => {
    const trimmed = draft.trim();
    setExpression(trimmed);
    setEditing(false);
    onDefinitionChange?.(block.id, { ...block.definition, expression: trimmed });
  }, [draft, block.id, block.definition, onDefinitionChange]);

  const handleCancel = useCallback(() => {
    setEditing(false);
    setDraft(expression);
  }, [expression]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") { e.preventDefault(); handleSave(); }
      if (e.key === "Escape") handleCancel();
    },
    [handleSave, handleCancel],
  );

  if (editing) {
    return (
      <div className="rounded-md border border-blue-400 bg-blue-50 p-3">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full rounded border-0 bg-transparent font-mono text-sm text-gray-900 focus:outline-none"
          placeholder="LaTeX expression, e.g. \sigma = \frac{F}{A}"
        />
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

  return (
    <div
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className={[
        "flex flex-col items-center rounded px-2 py-2",
        isSelected ? "bg-blue-50 ring-1 ring-blue-300" : "hover:bg-gray-50",
        canEdit ? "cursor-pointer" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {expression ? (
        <KatexSpan tex={expression} />
      ) : (
        <span className="text-sm text-gray-300 italic">
          {canEdit ? "Double-click to add a symbolic equation" : ""}
        </span>
      )}
    </div>
  );
}
