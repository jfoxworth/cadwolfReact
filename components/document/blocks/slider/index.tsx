"use client";

import { useState, useCallback, useEffect } from "react";
import type { VirtualBlock } from "@/types/document";
import KatexSpan from "@/components/ui/KatexSpan";

interface SliderDef {
  variableName: string;
  min: number;
  max: number;
  step: number;
  value: number;
  unit: string;
  orientation: "horizontal" | "vertical";
  [key: string]: unknown;
}

interface SliderBlockProps {
  block: VirtualBlock;
  canEdit: boolean;
  isSelected: boolean;
  onSelect: (id: string | null) => void;
  onSliderChange: (blockId: string, newValue: number) => void;
  onDefinitionChange: (blockId: string, newDef: Record<string, unknown>) => void;
}

export default function SliderBlock({
  block,
  canEdit,
  isSelected,
  onSelect,
  onSliderChange,
  onDefinitionChange,
}: SliderBlockProps) {
  const def = block.definition as SliderDef;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<SliderDef>(def);
  const [localValue, setLocalValue] = useState(def.value ?? 0);

  useEffect(() => { if (!isSelected) setEditing(false); }, [isSelected]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClick = useCallback(() => {
    onSelect(block.id);
  }, [onSelect, block.id]);

  const handleDoubleClick = useCallback(() => {
    if (!canEdit) return;
    setDraft({ ...def });
    setEditing(true);
  }, [canEdit, def]);

  const handleSliderInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = parseFloat(e.target.value);
      setLocalValue(v);
      onSliderChange(block.id, v);
    },
    [block.id, onSliderChange],
  );

  const handleSave = useCallback(() => {
    setEditing(false);
    setLocalValue(draft.value);
    onDefinitionChange(block.id, draft as Record<string, unknown>);
  }, [block.id, draft, onDefinitionChange]);

  const handleCancel = useCallback(() => {
    setEditing(false);
    setDraft({ ...def });
  }, [def]);

  // ── Edit mode ───────────────────────────────────────────────────────────────
  if (editing) {
    return (
      <div className="rounded-md border border-blue-400 bg-blue-50 p-4 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">Variable name</span>
            <input
              type="text"
              value={draft.variableName}
              onChange={(e) => setDraft((d) => ({ ...d, variableName: e.target.value }))}
              className="rounded border border-gray-300 px-2 py-1 font-mono text-sm focus:border-blue-400 focus:outline-none"
              placeholder="x"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">Unit</span>
            <input
              type="text"
              value={draft.unit}
              onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))}
              className="rounded border border-gray-300 px-2 py-1 font-mono text-sm focus:border-blue-400 focus:outline-none"
              placeholder="m, kN, …"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">Minimum</span>
            <input
              type="number"
              value={draft.min}
              onChange={(e) => setDraft((d) => ({ ...d, min: parseFloat(e.target.value) || 0 }))}
              className="rounded border border-gray-300 px-2 py-1 font-mono text-sm focus:border-blue-400 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">Maximum</span>
            <input
              type="number"
              value={draft.max}
              onChange={(e) => setDraft((d) => ({ ...d, max: parseFloat(e.target.value) || 0 }))}
              className="rounded border border-gray-300 px-2 py-1 font-mono text-sm focus:border-blue-400 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">Step</span>
            <input
              type="number"
              value={draft.step}
              onChange={(e) => setDraft((d) => ({ ...d, step: parseFloat(e.target.value) || 1 }))}
              className="rounded border border-gray-300 px-2 py-1 font-mono text-sm focus:border-blue-400 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">Default value</span>
            <input
              type="number"
              value={draft.value}
              onChange={(e) => setDraft((d) => ({ ...d, value: parseFloat(e.target.value) || 0 }))}
              className="rounded border border-gray-300 px-2 py-1 font-mono text-sm focus:border-blue-400 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 col-span-2">
            <span className="text-xs font-medium text-gray-600">Orientation</span>
            <div className="flex gap-3">
              {(["horizontal", "vertical"] as const).map((o) => (
                <label key={o} className="flex items-center gap-1 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="orientation"
                    value={o}
                    checked={(draft.orientation ?? "horizontal") === o}
                    onChange={() => setDraft((d) => ({ ...d, orientation: o }))}
                    className="accent-blue-600"
                  />
                  {o.charAt(0).toUpperCase() + o.slice(1)}
                </label>
              ))}
            </div>
          </label>
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
  const unit = def.unit ? ` ${def.unit}` : "";
  const displayValue = Number.isFinite(localValue)
    ? Number.isInteger(localValue)
      ? String(localValue)
      : parseFloat(localValue.toFixed(4)).toString()
    : "0";
  const katexTex = `${def.variableName || "?"} = ${displayValue}${unit ? `\\text{ ${def.unit}}` : ""}`;

  const isVertical = (def.orientation ?? "horizontal") === "vertical";

  const wrapperClass = [
    "rounded px-3 py-2",
    isVertical ? "flex flex-col items-center gap-2 w-fit" : "flex items-center gap-4",
    isSelected ? "bg-blue-50 ring-1 ring-blue-300" : "hover:bg-gray-50",
    canEdit ? "cursor-pointer" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div onClick={handleClick} onDoubleClick={handleDoubleClick} className={wrapperClass}>
      {isVertical ? (
        <>
          <KatexSpan tex={katexTex} />
          <input
            type="range"
            min={def.min}
            max={def.max}
            step={def.step}
            value={localValue}
            onChange={handleSliderInput}
            onClick={(e) => e.stopPropagation()}
            className="accent-blue-600 cursor-grab h-32"
            style={{ writingMode: "vertical-lr", direction: "rtl" }}
          />
        </>
      ) : (
        <>
          <KatexSpan tex={katexTex} />
          <input
            type="range"
            min={def.min}
            max={def.max}
            step={def.step}
            value={localValue}
            onChange={handleSliderInput}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 accent-blue-600 cursor-grab"
          />
        </>
      )}
    </div>
  );
}
