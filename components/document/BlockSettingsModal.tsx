"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Trash2 } from "lucide-react";
import type { VirtualBlock } from "@/types/document";
import type { ModelView } from "@/components/document/blocks/equation";

const WIDTHS = [
  { label: "1/4",  value: "1/4"  },
  { label: "1/3",  value: "1/3"  },
  { label: "1/2",  value: "1/2"  },
  { label: "2/3",  value: "2/3"  },
  { label: "3/4",  value: "3/4"  },
  { label: "Full", value: "full" },
];

const FONT_SIZES = [
  { label: "XS",   value: "0.75em"  },
  { label: "SM",   value: "0.875em" },
  { label: "MD",   value: "1em"     },
  { label: "LG",   value: "1.25em"  },
  { label: "XL",   value: "1.5em"   },
  { label: "2XL",  value: "2em"     },
];

const MODEL_OPTIONS: { label: string; value: ModelView }[] = [
  { label: "Equation",   value: "equation"   },
  { label: "Numerical",  value: "numerical"  },
  { label: "Units",      value: "units"      },
  { label: "Dimensions", value: "dimensions" },
  { label: "Quantity",   value: "quantity"   },
];

interface Props {
  block: VirtualBlock;
  moveInfo?: { currentIndex: number; total: number; options: { index: number; label: string }[] };
  modelView?: ModelView;
  onModelViewChange?: (blockId: string, view: ModelView) => void;
  onDefinitionChange: (blockId: string, newDef: Record<string, unknown>) => void;
  onMoveBlock: (blockId: string, newIndex: number) => void;
  onDeleteBlock: (blockId: string) => void;
  onClose: () => void;
}

export default function BlockSettingsModal({
  block,
  moveInfo,
  modelView = "equation",
  onModelViewChange,
  onDefinitionChange,
  onMoveBlock,
  onDeleteBlock,
  onClose,
}: Props) {
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isEquation = block.type === "EQUATION";
  const currentWidth = (block.definition.width as string) ?? "full";
  const currentFontSize = (block.definition.fontSize as string) ?? "1em";
  const atTop    = !moveInfo || moveInfo.currentIndex === 0;
  const atBottom = !moveInfo || moveInfo.currentIndex === moveInfo.total - 1;

  function handleDelete() {
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    onDeleteBlock(block.id);
    onClose();
  }

  return (
    <div
      ref={ref}
      className="absolute top-7 right-0 z-50 w-72 rounded-lg border border-gray-200 bg-white shadow-lg text-sm"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <span className="font-medium text-gray-700">Block Settings</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={14} />
        </button>
      </div>

      <div className="px-3 py-2 space-y-3">

        {/* ── Models (equation blocks only) ── */}
        {isEquation && (
          <section>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Display</p>
            <div className="flex flex-col gap-1">
              {MODEL_OPTIONS.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => onModelViewChange?.(block.id, value)}
                  className={[
                    "text-left px-2 py-1 text-xs rounded border transition-colors",
                    modelView === value
                      ? "border-blue-400 bg-blue-50 text-blue-700 font-medium"
                      : "border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-400",
                  ].join(" ")}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── Font Size (equation blocks only) ── */}
        {isEquation && (
          <section>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Font Size</p>
            <div className="flex gap-1 flex-wrap">
              {FONT_SIZES.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => onDefinitionChange(block.id, { ...block.definition, fontSize: value })}
                  className={[
                    "px-2 py-0.5 text-xs rounded border",
                    currentFontSize === value
                      ? "border-blue-400 bg-blue-50 text-blue-700"
                      : "border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-400",
                  ].join(" ")}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── Width ── */}
        <section>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Width</p>
          <div className="flex gap-1 flex-wrap">
            {WIDTHS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => onDefinitionChange(block.id, { ...block.definition, width: value })}
                className={[
                  "px-2 py-0.5 text-xs rounded border",
                  currentWidth === value
                    ? "border-blue-400 bg-blue-50 text-blue-700"
                    : "border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-400",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* ── Move ── */}
        <section>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Move</p>
          <div className="flex gap-2 mb-1.5">
            <button
              disabled={atTop}
              onClick={() => { moveInfo && onMoveBlock(block.id, moveInfo.currentIndex - 1); }}
              className="flex-1 py-1 text-xs rounded border border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ↑ Up one
            </button>
            <button
              disabled={atBottom}
              onClick={() => { moveInfo && onMoveBlock(block.id, moveInfo.currentIndex + 1); }}
              className="flex-1 py-1 text-xs rounded border border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ↓ Down one
            </button>
          </div>
          {moveInfo && moveInfo.total > 1 && (
            <select
              value={moveInfo.currentIndex}
              onChange={(e) => onMoveBlock(block.id, Number(e.target.value))}
              className="w-full rounded border border-gray-200 text-xs text-gray-500 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              {moveInfo.options.map((opt) => (
                <option key={opt.index} value={opt.index}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
        </section>

        {/* ── Delete ── */}
        <section className="pt-1 border-t border-gray-100">
          <button
            onClick={handleDelete}
            onBlur={() => setDeleteConfirm(false)}
            className={[
              "w-full flex items-center justify-center gap-1.5 py-1.5 text-xs rounded border transition-colors",
              deleteConfirm
                ? "border-red-500 bg-red-500 text-white hover:bg-red-600"
                : "border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600",
            ].join(" ")}
          >
            <Trash2 size={12} />
            {deleteConfirm ? "Confirm delete" : "Delete"}
          </button>
        </section>

      </div>
    </div>
  );
}

