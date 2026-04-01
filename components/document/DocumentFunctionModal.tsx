"use client";

import React, { useState, useRef } from "react";
import { X, Plus, Trash2, Check, LogIn, LogOut } from "lucide-react";
import type { FunctionPort, FunctionSettings } from "@/types/item";

interface DocumentFunctionModalProps {
  settings: FunctionSettings;
  /** Variable names currently defined in the document — offered as suggestions */
  availableVars: string[];
  onClose: () => void;
  onSave: (settings: FunctionSettings) => Promise<void>;
  readOnly?: boolean;
}

const EMPTY_PORT = (): FunctionPort => ({ variableName: "", description: "", unit: "" });

function PortList({
  title,
  description,
  icon: Icon,
  accentColor,
  ports,
  availableVars,
  onChange,
  readOnly,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  accentColor: { border: string; bg: string; icon: string; badge: string; badgeText: string };
  ports: FunctionPort[];
  availableVars: string[];
  onChange: (ports: FunctionPort[]) => void;
  readOnly?: boolean;
}) {
  const add = () => onChange([...ports, EMPTY_PORT()]);

  const remove = (i: number) => onChange(ports.filter((_, idx) => idx !== i));

  const update = (i: number, field: keyof FunctionPort, value: string) =>
    onChange(ports.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));

  // Vars not yet used in this list
  const usedNames = new Set(ports.map((p) => p.variableName).filter(Boolean));
  const suggestions = availableVars.filter((v) => !usedNames.has(v));

  return (
    <section>
      {/* Section header */}
      <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 mb-3 ${accentColor.border} ${accentColor.bg}`}>
        <Icon size={16} className={`shrink-0 ${accentColor.icon}`} />
        <div className="flex-1">
          <p className={`text-sm font-semibold ${accentColor.icon}`}>{title}</p>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${accentColor.badge} ${accentColor.badgeText}`}>
          {ports.length}
        </span>
      </div>

      {/* Port rows */}
      <div className="space-y-2">
        {ports.map((port, i) => (
          <div key={i} className="flex items-start gap-2 rounded-lg border border-gray-200 bg-white p-3">
            {/* Variable name */}
            <div className="flex-1 min-w-0">
              <label className="block text-xs text-gray-400 mb-1">Variable name</label>
              {readOnly ? (
                <p className="text-sm font-mono px-2 py-1.5 text-gray-800">{port.variableName || "—"}</p>
              ) : (
                <>
                  <input
                    list={`vars-${title}-${i}`}
                    type="text"
                    value={port.variableName}
                    onChange={(e) => update(i, "variableName", e.target.value)}
                    placeholder="e.g. force"
                    className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <datalist id={`vars-${title}-${i}`}>
                    {suggestions.map((v) => <option key={v} value={v} />)}
                  </datalist>
                </>
              )}
            </div>

            {/* Unit */}
            <div className="w-24 shrink-0">
              <label className="block text-xs text-gray-400 mb-1" title="For documentation only — not enforced by the solver">Expected unit</label>
              {readOnly ? (
                <p className="text-sm px-2 py-1.5 text-gray-800">{port.unit || "—"}</p>
              ) : (
                <input
                  type="text"
                  value={port.unit}
                  onChange={(e) => update(i, "unit", e.target.value)}
                  placeholder="e.g. N"
                  className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              )}
            </div>

            {/* Description */}
            <div className="flex-[2] min-w-0">
              <label className="block text-xs text-gray-400 mb-1">Description for caller</label>
              {readOnly ? (
                <p className="text-sm px-2 py-1.5 text-gray-800">{port.description || "—"}</p>
              ) : (
                <input
                  type="text"
                  value={port.description}
                  onChange={(e) => update(i, "description", e.target.value)}
                  placeholder="What the caller should pass here"
                  className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              )}
            </div>

            {/* Remove */}
            {!readOnly && (
              <button
                onClick={() => remove(i)}
                className="mt-6 p-1.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 shrink-0"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ))}
      </div>

      {!readOnly && (
        <button
          onClick={add}
          className="mt-2 flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 px-1 py-1 transition-colors"
        >
          <Plus size={13} />
          Add {title.toLowerCase().replace(" variables", "")} variable
        </button>
      )}
    </section>
  );
}

export default function DocumentFunctionModal({
  settings,
  availableVars,
  onClose,
  onSave,
  readOnly = false,
}: DocumentFunctionModalProps) {
  const [inputs,  setInputs]  = useState<FunctionPort[]>(settings.inputs.map((p) => ({ ...p })));
  const [outputs, setOutputs] = useState<FunctionPort[]>(settings.outputs.map((p) => ({ ...p })));
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  const handleSave = async () => {
    setSaving(true);
    await onSave({ inputs, outputs });
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
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-semibold text-gray-900">File as a Function</h2>
            <p className="text-sm text-gray-500 mt-1">
              Define the interface for callers — which variables to provide as inputs and which this document returns as outputs. Units and descriptions are documentation only; the solver does not enforce them.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-7">
          <PortList
            title="Input Variables"
            description="Variables the calling document must provide"
            icon={LogIn}
            accentColor={{
              border:     "border-blue-200",
              bg:         "bg-blue-50",
              icon:       "text-blue-500",
              badge:      "bg-blue-100",
              badgeText:  "text-blue-600",
            }}
            ports={inputs}
            availableVars={availableVars}
            onChange={setInputs}
            readOnly={readOnly}
          />

          <PortList
            title="Output Variables"
            description="Variables this document returns to the calling document"
            icon={LogOut}
            accentColor={{
              border:     "border-emerald-200",
              bg:         "bg-emerald-50",
              icon:       "text-emerald-500",
              badge:      "bg-emerald-100",
              badgeText:  "text-emerald-600",
            }}
            ports={outputs}
            availableVars={availableVars}
            onChange={setOutputs}
            readOnly={readOnly}
          />

          {/* Empty-state hint */}
          {inputs.length === 0 && outputs.length === 0 && (
            <p className="text-xs text-center text-gray-400 py-2">
              Add at least one input or output variable to define this file&apos;s function interface.
            </p>
          )}
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
                {saved ? <><Check size={14} />Saved</> : saving ? "Saving…" : "Save"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
