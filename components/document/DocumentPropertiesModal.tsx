"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Check, Eye, EyeOff } from "lucide-react";
import type { Item, SolverLocation } from "@/types/item";

interface DocumentPropertiesModalProps {
  document: Item;
  onClose: () => void;
  onSave: (updates: {
    name: string;
    width: number;
    solver: SolverLocation;
  }) => Promise<void>;
  readOnly?: boolean;
}

const SOLVER_OPTIONS: { value: SolverLocation; label: string; description: string; disabled?: boolean }[] = [
  {
    value: "browser",
    label: "JavaScript in Browser",
    description: "Equations are solved locally in your browser using our JS engine.",
  },
  {
    value: "python",
    label: "Python on Your Computer",
    description: "Connect a local Python kernel for more advanced math libraries.",
  },
  {
    value: "server",
    label: "CadWolf Server",
    description: "Offload computation to our servers. Coming soon.",
    disabled: true,
  },
];

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function DocumentPropertiesModal({
  document,
  onClose,
  onSave,
  readOnly = false,
}: DocumentPropertiesModalProps) {
  const [name, setName]   = useState(document.name);
  const [width, setWidth] = useState(String(document.width ?? 825));
  const [solver, setSolver] = useState<SolverLocation>(document.solver ?? "browser");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSave = async () => {
    setSaving(true);
    const w = parseInt(width, 10);
    await onSave({
      name:   name.trim() || document.name,
      width:  isNaN(w) || w < 400 ? 825 : w,
      solver,
    });
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
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Document Properties</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-7">

          {/* Title */}
          <section>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Title
            </label>
            {readOnly ? (
              <p className="text-sm text-gray-800 px-3 py-2">{name}</p>
            ) : (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Document title"
              />
            )}
          </section>

          {/* Document Width */}
          <section>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Content Width
            </label>
            {readOnly ? (
              <p className="text-sm text-gray-800 px-3 py-2">{width} px</p>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    min={400}
                    max={2000}
                    className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="text-sm text-gray-500">px</span>
                </div>
                <p className="mt-1 text-xs text-gray-400">Maximum content width. Default is 825 px.</p>
              </>
            )}
          </section>

          {/* Solver Location */}
          <section>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Equation Solver
            </label>
            <div className="space-y-2">
              {SOLVER_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors ${
                    opt.disabled
                      ? "opacity-50 cursor-not-allowed border-gray-200 bg-gray-50"
                      : solver === opt.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="solver"
                    value={opt.value}
                    checked={solver === opt.value}
                    disabled={opt.disabled}
                    onChange={() => setSolver(opt.value)}
                    className="mt-0.5 accent-blue-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {opt.label}
                      {opt.disabled && (
                        <span className="ml-2 text-xs font-normal text-gray-400">Coming soon</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </section>

          {/* Dates */}
          <section>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Dates
            </label>
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-400">Created</span>
                <span>{fmt(document.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Last Updated</span>
                <span>{fmt(document.updatedAt)}</span>
              </div>
            </div>
          </section>

          {/* Permissions — read-only display of current user's access */}
          <section>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Your Permissions
            </label>
            <div className="space-y-2">
              <div className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3">
                <Eye size={15} className="shrink-0 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-gray-800">View — Open to everyone</p>
                  <p className="text-xs text-gray-500 mt-0.5">Anyone with the link can view this document.</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3">
                <EyeOff size={15} className="shrink-0 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Edit — Not permitted</p>
                  <p className="text-xs text-gray-500 mt-0.5">You do not have edit access to this document.</p>
                </div>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-400">Full permission management coming soon.</p>
          </section>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          {readOnly ? (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md bg-gray-900 text-white text-sm font-medium hover:bg-gray-700"
            >
              Close
            </button>
          ) : (
            <>
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
                  <>
                    <Check size={14} />
                    Saved
                  </>
                ) : saving ? (
                  "Saving…"
                ) : (
                  "Save"
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
