"use client";

import React, { useState, useRef } from "react";
import { X, List, Eye, EyeOff, Check } from "lucide-react";
import type { TocSettings } from "@/types/item";

interface DocumentTocModalProps {
  toc: TocSettings;
  onClose: () => void;
  onSave: (settings: TocSettings) => Promise<void>;
}

const LEVELS: { level: TocSettings["maxLevel"]; label: string; size: string; description: string }[] = [
  { level: 1, label: "H1", size: "text-xl",   description: "Top-level titles only" },
  { level: 2, label: "H2", size: "text-lg",   description: "Major sections" },
  { level: 3, label: "H3", size: "text-base", description: "Sub-sections" },
  { level: 4, label: "H4", size: "text-sm",   description: "Sub-sub-sections" },
  { level: 5, label: "H5", size: "text-xs",   description: "Deepest level" },
];

export default function DocumentTocModal({ toc, onClose, onSave }: DocumentTocModalProps) {
  const [show, setShow]         = useState(toc.show);
  const [maxLevel, setMaxLevel] = useState<TocSettings["maxLevel"]>(toc.maxLevel);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  const handleSave = async () => {
    setSaving(true);
    await onSave({ show, maxLevel });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <List size={16} className="text-gray-500" />
            <h2 className="text-base font-semibold text-gray-900">Table of Contents</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-6">

          {/* Show / Hide toggle */}
          <section>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Visibility
            </p>
            <div className="space-y-1.5">
              <button
                onClick={() => setShow(true)}
                className={`w-full flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                  show
                    ? "border-blue-200 bg-blue-50"
                    : "border-gray-200 bg-white opacity-50"
                }`}
              >
                <Eye size={16} className={`shrink-0 ${show ? "text-blue-500" : "text-gray-300"}`} />
                <div className="flex-1">
                  <p className={`text-sm font-medium ${show ? "text-gray-800" : "text-gray-400"}`}>
                    Show table of contents
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Rendered at the top of the document</p>
                </div>
                {show && <Check size={14} className="shrink-0 text-blue-500" />}
              </button>

              <button
                onClick={() => setShow(false)}
                className={`w-full flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                  !show
                    ? "border-gray-300 bg-gray-50"
                    : "border-gray-200 bg-white opacity-50"
                }`}
              >
                <EyeOff size={16} className={`shrink-0 ${!show ? "text-gray-500" : "text-gray-300"}`} />
                <div className="flex-1">
                  <p className={`text-sm font-medium ${!show ? "text-gray-700" : "text-gray-400"}`}>
                    Hide table of contents
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">No ToC rendered; headers remain in document</p>
                </div>
                {!show && <Check size={14} className="shrink-0 text-gray-500" />}
              </button>
            </div>
          </section>

          {/* Depth selector */}
          <section className={show ? "" : "opacity-40 pointer-events-none"}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Include headers up to
            </p>
            <div className="space-y-1.5">
              {LEVELS.map(({ level, label, size, description }) => {
                const included = level <= maxLevel;
                const isTarget = level === maxLevel;
                return (
                  <button
                    key={level}
                    onClick={() => setMaxLevel(level)}
                    className={`w-full flex items-center gap-3 rounded-lg border px-4 py-2.5 text-left transition-colors ${
                      included
                        ? isTarget
                          ? "border-indigo-300 bg-indigo-50"
                          : "border-indigo-200 bg-indigo-50/60"
                        : "border-gray-200 bg-white opacity-40"
                    }`}
                  >
                    {/* Level badge */}
                    <span
                      className={`shrink-0 font-bold w-8 ${size} ${
                        included ? "text-indigo-600" : "text-gray-300"
                      }`}
                    >
                      {label}
                    </span>
                    <div className="flex-1">
                      <p className={`text-sm font-medium leading-tight ${included ? "text-gray-800" : "text-gray-400"}`}>
                        {label}
                        {isTarget && (
                          <span className="ml-2 text-xs font-normal text-indigo-400">← max depth</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{description}</p>
                    </div>
                    {included && (
                      <Check size={13} className={`shrink-0 ${isTarget ? "text-indigo-500" : "text-indigo-300"}`} />
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-gray-400">
              All levels up to and including the selected depth are shown.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-60"
          >
            {saved ? (
              <><Check size={14} />Saved</>
            ) : saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
