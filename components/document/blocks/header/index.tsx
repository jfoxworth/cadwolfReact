"use client";

import React, { memo, useState, useRef, useEffect } from "react";
import type { Block } from "@/types/document";
import type { SelectBlockFn } from "../../documentWrapper";

const LEVELS = [1, 2, 3, 4, 5, 6] as const;
type Level = typeof LEVELS[number];

const textStyles: Record<Level, string> = {
  1: "text-3xl font-bold text-gray-900",
  2: "text-2xl font-bold text-gray-900",
  3: "text-xl  font-semibold text-gray-800",
  4: "text-lg  font-semibold text-gray-800",
  5: "text-base font-semibold text-gray-700",
  6: "text-sm  font-semibold text-gray-700",
};

const marginStyles: Record<Level, string> = {
  1: "mt-8 mb-4",
  2: "mt-6 mb-3",
  3: "mt-5 mb-2",
  4: "mt-4 mb-2",
  5: "mt-3 mb-1",
  6: "mt-3 mb-1",
};

interface HeaderBlockProps {
  block: Block;
  edit?: boolean;
  isSelected?: boolean;
  onSelect?: SelectBlockFn;
  onDefinitionChange?: (blockId: string, newDef: Record<string, unknown>) => void;
}

export default memo(function HeaderBlock({
  block,
  edit = false,
  isSelected = false,
  onSelect,
  onDefinitionChange,
}: HeaderBlockProps) {
  const initialText  = block.definition.text  as string;
  const initialLevel = ((block.definition.level as number) ?? 2) as Level;

  const [editing,      setEditing]      = useState(false);
  const [draftText,    setDraftText]    = useState(initialText);

  useEffect(() => { if (!isSelected) setEditing(false); }, [isSelected]); // eslint-disable-line react-hooks/exhaustive-deps
  const [draftLevel,   setDraftLevel]   = useState<Level>(initialLevel);
  const [displayText,  setDisplayText]  = useState(initialText);
  const [displayLevel, setDisplayLevel] = useState<Level>(initialLevel);

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when edit mode opens
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  // Close edit mode when this block is deselected externally
  useEffect(() => {
    if (!isSelected && editing) {
      setEditing(false);
      setDraftText(displayText);
      setDraftLevel(displayLevel);
    }
  }, [isSelected]); // eslint-disable-line react-hooks/exhaustive-deps

  function openEdit(e: React.MouseEvent) {
    if (!edit) return;
    e.stopPropagation();
    onSelect?.(block.id);
    setDraftText(displayText);
    setDraftLevel(displayLevel);
    setEditing(true);
  }

  function save() {
    const text = draftText.trim() || displayText;
    setDisplayText(text);
    setDisplayLevel(draftLevel);
    setEditing(false);
    onSelect?.(null);
    onDefinitionChange?.(block.id, { ...block.definition, text, level: draftLevel });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter")  { e.preventDefault(); save(); }
    if (e.key === "Escape") { setEditing(false); setDraftText(displayText); setDraftLevel(displayLevel); }
  }

  const Tag = `h${displayLevel}` as React.ElementType;

  // ── Edit mode ──────────────────────────────────────────────────────────────
  if (editing) {
    return (
      <div className={`${marginStyles[draftLevel]} rounded-md ring-2 ring-blue-400 bg-white p-3`}>
        {/* Level selector */}
        <div className="flex items-center gap-1 mb-2">
          {LEVELS.map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setDraftLevel(lvl)}
              className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors ${
                draftLevel === lvl
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              H{lvl}
            </button>
          ))}
          <span className="ml-2 text-xs text-gray-400">Enter to save · Esc to cancel</span>
        </div>

        {/* Styled input */}
        <input
          ref={inputRef}
          type="text"
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={save}
          className={`w-full bg-transparent outline-none border-none ${textStyles[draftLevel]} placeholder:text-gray-300`}
          placeholder="Heading text…"
        />
      </div>
    );
  }

  // ── View mode ──────────────────────────────────────────────────────────────
  if (!edit) {
    return (
      <Tag className={`${textStyles[displayLevel]} ${marginStyles[displayLevel]}`}>
        {displayText}
      </Tag>
    );
  }

  // ── Edit-permitted, idle ───────────────────────────────────────────────────
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onSelect?.(isSelected ? null : block.id); }}
      onDoubleClick={openEdit}
      className={`rounded-md transition-all px-3 cursor-pointer ${
        isSelected
          ? "ring-2 ring-blue-200 bg-blue-50/30"
          : "hover:bg-gray-50"
      }`}
      title="Double-click to edit"
    >
      <Tag className={`${textStyles[displayLevel]} ${marginStyles[displayLevel]}`}>
        {displayText}
      </Tag>
    </div>
  );
});
