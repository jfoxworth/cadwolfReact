"use client";

import { useState, useCallback, useEffect } from "react";
import type { VirtualBlock } from "@/types/document";

interface DropdownDef {
  variableName: string;
  options: string[];
  selectedIndex: number;
  [key: string]: unknown;
}

interface DropdownBlockProps {
  block: VirtualBlock;
  canEdit: boolean;
  isSelected: boolean;
  onSelect: (id: string | null) => void;
  onDefinitionChange: (blockId: string, newDef: Record<string, unknown>) => void;
}

export default function DropdownBlock({
  block,
  canEdit,
  isSelected,
  onSelect,
  onDefinitionChange,
}: DropdownBlockProps) {
  const def = block.definition as DropdownDef;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<DropdownDef>({ ...def });

  useEffect(() => { if (!isSelected) setEditing(false); }, [isSelected]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClick = useCallback(() => {
    onSelect(block.id);
  }, [onSelect, block.id]);

  const handleDoubleClick = useCallback(() => {
    if (!canEdit) return;
    setDraft({ ...def });
    setEditing(true);
  }, [canEdit, def]);

  const handleSelect = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const idx = parseInt(e.target.value, 10);
      onDefinitionChange(block.id, { ...def, selectedIndex: idx } as Record<string, unknown>);
    },
    [block.id, def, onDefinitionChange],
  );

  const handleSave = useCallback(() => {
    setEditing(false);
    onDefinitionChange(block.id, draft as Record<string, unknown>);
  }, [block.id, draft, onDefinitionChange]);

  const handleCancel = useCallback(() => {
    setEditing(false);
    setDraft({ ...def });
  }, [def]);

  const handleOptionChange = useCallback((idx: number, value: string) => {
    setDraft((d) => {
      const options = [...d.options];
      options[idx] = value;
      return { ...d, options };
    });
  }, []);

  const handleAddOption = useCallback(() => {
    setDraft((d) => ({ ...d, options: [...d.options, ""] }));
  }, []);

  const handleRemoveOption = useCallback((idx: number) => {
    setDraft((d) => {
      const options = d.options.filter((_, i) => i !== idx);
      const selectedIndex = Math.min(d.selectedIndex, Math.max(0, options.length - 1));
      return { ...d, options, selectedIndex };
    });
  }, []);

  // ── Edit mode ───────────────────────────────────────────────────────────────
  if (editing) {
    return (
      <div className="rounded-md border border-blue-400 bg-blue-50 p-4 flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Variable name</span>
          <input
            type="text"
            value={draft.variableName}
            onChange={(e) => setDraft((d) => ({ ...d, variableName: e.target.value }))}
            className="rounded border border-gray-300 px-2 py-1 font-mono text-sm focus:border-blue-400 focus:outline-none w-48"
            placeholder="x"
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-gray-600">Options</span>
          {draft.options.map((opt, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-5 text-right shrink-0">{idx + 1}.</span>
              <input
                type="text"
                value={opt}
                onChange={(e) => handleOptionChange(idx, e.target.value)}
                className="flex-1 rounded border border-gray-300 px-2 py-1 font-mono text-sm focus:border-blue-400 focus:outline-none"
                placeholder="value, e.g. 5m or 10kN"
              />
              <button
                onClick={() => handleRemoveOption(idx)}
                className="text-gray-400 hover:text-red-500 text-xs px-1"
                title="Remove option"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={handleAddOption}
            className="self-start text-xs text-blue-600 hover:text-blue-800 mt-1"
          >
            + Add option
          </button>
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
    );
  }

  // ── View mode ───────────────────────────────────────────────────────────────
  const options = def.options ?? [];
  const selectedIndex = def.selectedIndex ?? 0;

  return (
    <div
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className={[
        "flex items-center gap-3 rounded px-3 py-2",
        isSelected ? "bg-blue-50 ring-1 ring-blue-300" : "hover:bg-gray-50",
        canEdit ? "cursor-pointer" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="font-mono text-sm font-medium text-gray-700 shrink-0">
        {def.variableName || "—"}
      </span>
      <select
        value={selectedIndex}
        onChange={handleSelect}
        onClick={(e) => e.stopPropagation()}
        className="text-sm border border-gray-300 rounded-md px-3 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {options.map((opt, idx) => (
          <option key={idx} value={idx}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
