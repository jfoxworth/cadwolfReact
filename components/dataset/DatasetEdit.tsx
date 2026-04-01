"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { ChevronUp, ChevronDown, X } from "lucide-react";
import type { Dataset, DatasetParser } from "@/types/dataset";
import {
  parseDataset,
  computeSizeString,
  sliceTo2D,
  sizeAtExtraDim,
} from "@/utils/parseDataset";
import DatasetActionPanel from "./DatasetActionPanel";

type ActiveTab = "settings" | "input" | "results";
type ModalKind = "title" | "description";

const PRESET_PARSERS: { label: string; separator: string }[] = [
  { label: "Newline",        separator: "\\n" },
  { label: "Comma",          separator: "," },
  { label: "Semicolon",      separator: ";" },
  { label: "Tab",            separator: "\\t" },
  { label: "Double newline", separator: "\\n\\n" },
];

// ─── Field Modal ─────────────────────────────────────────────────────────────

function FieldModal({
  title,
  value,
  onChange,
  onSave,
  onClose,
  multiline = false,
}: {
  title: string;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onClose: () => void;
  multiline?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>

        {multiline ? (
          <textarea
            autoFocus
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-y h-32 focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        ) : (
          <input
            autoFocus
            type="text"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSave();
              if (e.key === "Escape") onClose();
            }}
          />
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Dataset Edit ─────────────────────────────────────────────────────────────

export default function DatasetEdit({ dataset }: { dataset: Dataset }) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("settings");
  const [parsers, setParsers] = useState<DatasetParser[]>(dataset.parsers);
  const [rawText, setRawText] = useState(dataset.rawText);
  const [dimSelectors, setDimSelectors] = useState<number[]>([]);
  const [openModal, setOpenModal] = useState<ModalKind | null>(null);
  const [draftTitle, setDraftTitle] = useState(dataset.name);
  const [draftDescription, setDraftDescription] = useState(dataset.description ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    try {
      // Build real object using the configured parsers (honors actual separators)
      const rows2D = sliceTo2D(parseDataset(rawText, parsers), parsers.length, []);
      const real: Record<string, string> = {};
      rows2D.forEach((row, r) => {
        row.forEach((cell, c) => {
          real[`${r}-${c}`] = cell;
        });
      });
      const rows = rows2D.length;
      const cols = rows2D.reduce((max, row) => Math.max(max, row.length), 0);
      const itemData = JSON.stringify({
        real,
        size: `${rows}x${cols}`,
        inputString: rawText,
        parsers: parsers.map((p) => p.separator),
        description: draftDescription,
      });
      const res = await fetch(`/api/file/${dataset.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemData }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [rawText, parsers, draftDescription, dataset.id]);

  // Keep dimSelectors length in sync with number of extra dimensions
  useEffect(() => {
    const extraDims = Math.max(0, parsers.length - 2);
    setDimSelectors((prev) => {
      if (prev.length === extraDims) return prev;
      return Array.from({ length: extraDims }, (_, i) => prev[i] ?? 0);
    });
  }, [parsers.length]);

  const parsed = useMemo(() => parseDataset(rawText, parsers), [rawText, parsers]);

  const sizeString = useMemo(
    () => (parsers.length > 0 ? computeSizeString(parsed, parsers.length) : "—"),
    [parsed, parsers.length],
  );

  // ── Parser handlers ──────────────────────────────────────────────────────

  function addParser(preset?: { label: string; separator: string }) {
    setParsers((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label: preset?.label ?? "Level",
        separator: preset?.separator ?? ",",
      },
    ]);
  }

  function removeParser(id: string) {
    setParsers((prev) => prev.filter((p) => p.id !== id));
  }

  function updateParser(id: string, field: keyof DatasetParser, value: string) {
    setParsers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    );
  }

  function moveParser(id: string, direction: "up" | "down") {
    setParsers((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      const swap = direction === "up" ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  }

  // ── Tab content ──────────────────────────────────────────────────────────

  const settingsTab = (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Define how your raw text is split into dimensions. The first parser splits
        the innermost dimension (individual values); the last splits the outermost
        (rows/blocks).
      </p>

      {parsers.length > 0 && (
        <p className="text-xs text-gray-400 mb-4">
          Current size:{" "}
          <span className="font-mono text-gray-700">{sizeString}</span>
        </p>
      )}

      <div className="flex flex-col gap-2">
        {parsers.map((parser, idx) => (
          <div
            key={parser.id}
            className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 bg-gray-50"
          >
            <span className="text-xs text-gray-400 w-5 shrink-0 text-center">
              {idx + 1}
            </span>

            <input
              className="flex-1 text-sm border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
              placeholder="Label (e.g. Row)"
              value={parser.label}
              onChange={(e) => updateParser(parser.id, "label", e.target.value)}
            />

            <input
              className="w-28 text-sm font-mono border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
              placeholder="\n"
              value={parser.separator}
              onChange={(e) => updateParser(parser.id, "separator", e.target.value)}
            />

            <button
              disabled={idx === 0}
              onClick={() => moveParser(parser.id, "up")}
              title="Move up"
              className="text-gray-400 hover:text-gray-700 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronUp size={16} />
            </button>
            <button
              disabled={idx === parsers.length - 1}
              onClick={() => moveParser(parser.id, "down")}
              title="Move down"
              className="text-gray-400 hover:text-gray-700 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronDown size={16} />
            </button>
            <button
              onClick={() => removeParser(parser.id)}
              title="Remove"
              className="text-red-400 hover:text-red-600 transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>

      {parsers.length === 0 && (
        <p className="text-sm text-gray-400 italic mb-4">
          No parsers yet. Add one below to start splitting your data.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {PRESET_PARSERS.map((preset) => (
          <button
            key={preset.separator}
            onClick={() => addParser(preset)}
            className="text-xs px-2.5 py-1 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
          >
            + {preset.label}
          </button>
        ))}
        <button
          onClick={() => addParser()}
          className="text-xs px-2.5 py-1 rounded-full border border-dashed border-gray-300 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        >
          + Custom
        </button>
      </div>
    </div>
  );

  const inputTab = (
    <div>
      <p className="text-sm text-gray-500 mb-2">
        Paste your raw data below. Use the{" "}
        <button
          onClick={() => setActiveTab("settings")}
          className="text-blue-600 hover:underline"
        >
          Settings
        </button>{" "}
        tab to define how it&apos;s structured.
      </p>
      <textarea
        className="w-full h-96 font-mono text-sm border border-gray-200 rounded-lg p-3 resize-y focus:outline-none focus:ring-2 focus:ring-blue-300"
        placeholder={"Paste data here...\ne.g. row1col1,row1col2\nrow2col1,row2col2"}
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
      />
    </div>
  );

  const resultsTab = (() => {
    if (!rawText.trim()) {
      return (
        <p className="text-sm text-gray-400 italic">
          No data yet. Paste data in the{" "}
          <button
            onClick={() => setActiveTab("input")}
            className="text-blue-600 hover:underline"
          >
            Input
          </button>{" "}
          tab.
        </p>
      );
    }

    if (parsers.length === 0) {
      return (
        <pre className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-200 whitespace-pre-wrap overflow-auto">
          {rawText}
        </pre>
      );
    }

    const rows2D = sliceTo2D(parsed, parsers.length, dimSelectors);

    return (
      <div>
        {/* Dimension selectors for dims 3+ */}
        {dimSelectors.length > 0 && (
          <div className="flex flex-wrap gap-4 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide self-center">
              Viewing slice:
            </span>
            {dimSelectors.map((selectedIdx, i) => {
              const dimLabel = parsers[i + 2]?.label ?? `Dim ${i + 3}`;
              const count = sizeAtExtraDim(parsed, i, dimSelectors);
              return (
                <label
                  key={i}
                  className="flex items-center gap-2 text-sm text-gray-600"
                >
                  <span className="font-medium">{dimLabel}:</span>
                  <select
                    value={selectedIdx}
                    onChange={(e) => {
                      const next = [...dimSelectors];
                      next[i] = Number(e.target.value);
                      for (let j = i + 1; j < next.length; j++) next[j] = 0;
                      setDimSelectors(next);
                    }}
                    className="border border-gray-200 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
                  >
                    {Array.from({ length: count }, (_, idx) => (
                      <option key={idx} value={idx}>
                        {idx + 1}
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>
        )}

        {/* Size badge */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            {sizeString}
          </span>
          <span className="text-xs text-gray-400">
            {parsers.map((p) => p.label).join(" × ")}
          </span>
        </div>

        <div className="overflow-auto rounded-lg border border-gray-200">
          <table className="text-sm text-left w-full">
            <tbody>
              {rows2D.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className="px-3 py-2 border-b border-gray-100 font-mono text-gray-700 whitespace-nowrap text-right tabular-nums"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  })();

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="flex gap-4 items-start">
        {/* LEFT: Action panel + Save */}
        <div className="sticky top-4 flex flex-col gap-3">
          <DatasetActionPanel
            onEditTitle={() => setOpenModal("title")}
            onEditDescription={() => setOpenModal("description")}
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          {saveError && <p className="text-xs text-red-500">{saveError}</p>}
        </div>

        {/* RIGHT: Tab panel */}
        <div className="flex-1 min-w-0">
          {/* Tab bar */}
          <div className="flex border-b border-gray-200 mb-5">
            {(["settings", "input", "results"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors capitalize ${
                  activeTab === tab
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === "settings" && settingsTab}
          {activeTab === "input"    && inputTab}
          {activeTab === "results"  && resultsTab}
        </div>

      </div>

      {/* Modals */}
      {openModal === "title" && (
        <FieldModal
          title="Edit Title"
          value={draftTitle}
          onChange={setDraftTitle}
          onSave={async () => {
            await fetch(`/api/file/${dataset.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: draftTitle }),
            });
            setOpenModal(null);
          }}
          onClose={() => setOpenModal(null)}
        />
      )}
      {openModal === "description" && (
        <FieldModal
          title="Edit Description"
          value={draftDescription}
          onChange={setDraftDescription}
          onSave={async () => {
            await fetch(`/api/file/${dataset.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ description: draftDescription }),
            });
            setOpenModal(null);
          }}
          onClose={() => setOpenModal(null)}
          multiline
        />
      )}
    </>
  );
}
