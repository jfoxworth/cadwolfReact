"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X, Plus, Trash2, Folder, Database,
  RefreshCw, AlertCircle, ExternalLink, ChevronRight, Home, Link,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

export interface DatasetImportEntry {
  id:             number;
  datasetId:      number;
  datasetName:    string;
  localAlias:     string;
  cachedValues:   string | null;
  datapointCount: number;
  matrixSize:     string | null;
  needsUpdate:    boolean;
  order:          number;
}

interface BrowseItem {
  id:         number;
  name:       string;
  fileTypeId: string;
  slug:       string | null;
  parentId:   number | null;
}

interface BrowseDataset {
  id:             number;
  name:           string;
  description:    string;
  datapointCount: number;
  real:           Record<string, string> | null;
  size:           string | null;
}

interface DocumentDatasetInputsModalProps {
  fileId:    number;
  entries:   DatasetImportEntry[];
  onClose:   () => void;
  onChanged: (entries: DatasetImportEntry[]) => void;
  readOnly?: boolean;
}

type View = "list" | "browse";

// ── Main component ────────────────────────────────────────────────────────────

export default function DocumentDatasetInputsModal({
  fileId,
  entries: initialEntries,
  onClose,
  onChanged,
  readOnly = false,
}: DocumentDatasetInputsModalProps) {
  const [entries, setEntries] = useState<DatasetImportEntry[]>(initialEntries);
  const [view,    setView]    = useState<View>("list");
  const backdropRef = useRef<HTMLDivElement>(null);

  async function updateAlias(id: number, localAlias: string) {
    await fetch(`/api/dataset-import/${id}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ localAlias }),
    });
    const next = entries.map((e) => e.id === id ? { ...e, localAlias } : e);
    setEntries(next);
    onChanged(next);
  }

  async function deleteEntry(id: number) {
    await fetch(`/api/dataset-import/${id}`, { method: "DELETE" });
    const next = entries.filter((e) => e.id !== id);
    setEntries(next);
    onChanged(next);
  }

  async function handleImportSelected(dataset: BrowseDataset) {
    // Use 2D real/size if available (new file-based datasets), else fall back to flat datapoints
    let cachedValues: string | null = null;
    if (dataset.real && dataset.size) {
      cachedValues = JSON.stringify({ real: dataset.real, size: dataset.size });
    } else {
      const dpRes = await fetch(`/api/dataset/${dataset.id}/datapoints`);
      const values: (string | number)[] = dpRes.ok ? await dpRes.json() : [];
      cachedValues = JSON.stringify(values);
    }

    const res = await fetch("/api/dataset-import", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        fileId,
        datasetId:      dataset.id,
        datasetName:    dataset.name,
        localAlias:     dataset.name.replace(/\s+/g, "_").replace(/[^A-Za-z0-9_]/g, ""),
        cachedValues,
        datapointCount: dataset.datapointCount,
        matrixSize:     dataset.size ?? null,
      }),
    });
    const created: DatasetImportEntry = await res.json();
    const next = [...entries, created];
    setEntries(next);
    onChanged(next);
    setView("list");
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div
        className="relative bg-white rounded-xl shadow-2xl flex flex-col"
        style={{ width: "min(95vw, 1200px)", maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Dataset Inputs</h2>
            <p className="text-sm text-gray-500 mt-1">
              Import datasets as array variables. Each dataset is available as{" "}
              <span className="font-mono">alias = [v1, v2, …]</span>.
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {view === "list" ? (
            <ListView
              entries={entries}
              onUpdateAlias={updateAlias}
              onDelete={deleteEntry}
              onAddClick={() => !readOnly && setView("browse")}
              onClose={onClose}
              readOnly={readOnly}
            />
          ) : (
            <BrowseView
              existingDatasetIds={new Set(entries.map((e) => e.datasetId))}
              onBack={() => setView("list")}
              onSelect={handleImportSelected}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── List view ─────────────────────────────────────────────────────────────────

function ListView({
  entries, onUpdateAlias, onDelete, onAddClick, onClose, readOnly,
}: {
  entries:       DatasetImportEntry[];
  onUpdateAlias: (id: number, alias: string) => void;
  onDelete:      (id: number) => void;
  onAddClick:    () => void;
  onClose:       () => void;
  readOnly?:     boolean;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
            <Database size={32} className="opacity-30" />
            <p className="text-sm">No datasets imported yet.</p>
            {!readOnly && (
              <button
                onClick={onAddClick}
                className="mt-2 flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
              >
                <Plus size={14} /> Import a Dataset
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left">
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Dataset</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Local Alias</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Size</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Preview</th>
                {!readOnly && <th className="px-4 py-2.5 w-8"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((e) => (
                <DatasetRow key={e.id} entry={e} onUpdateAlias={onUpdateAlias} onDelete={onDelete} readOnly={readOnly} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="shrink-0 border-t border-gray-200 px-6 py-3 flex justify-between items-center">
        {!readOnly && entries.length > 0 ? (
          <button
            onClick={onAddClick}
            className="flex items-center gap-2 px-4 py-2 rounded-md border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
          >
            <Plus size={14} /> Add Dataset
          </button>
        ) : <span />}
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-md bg-gray-900 text-white text-sm font-medium hover:bg-gray-700"
        >
          {readOnly ? "Close" : "Done"}
        </button>
      </div>
    </div>
  );
}

// ── Dataset row ───────────────────────────────────────────────────────────────

function DatasetRow({
  entry, onUpdateAlias, onDelete, readOnly,
}: {
  entry:         DatasetImportEntry;
  onUpdateAlias: (id: number, alias: string) => void;
  onDelete:      (id: number) => void;
  readOnly?:     boolean;
}) {
  const [alias, setAlias] = useState(entry.localAlias);

  const sizeDisplay = entry.matrixSize ?? `${entry.datapointCount} value${entry.datapointCount !== 1 ? "s" : ""}`;

  let preview = "—";
  try {
    if (entry.cachedValues) {
      const parsed = JSON.parse(entry.cachedValues);
      if (Array.isArray(parsed)) {
        const shown = parsed.slice(0, 4).join(", ");
        preview = parsed.length > 4 ? `[${shown}, …]` : `[${shown}]`;
      } else if (parsed.real) {
        const vals = Object.values(parsed.real as Record<string, string>).slice(0, 4);
        preview = `[${vals.join(", ")}, …]`;
      }
    }
  } catch { /* ignore */ }

  return (
    <tr className="hover:bg-gray-50 group">
      <td className="px-4 py-3">
        <a
          href={`/dataset/${entry.datasetId}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-blue-600 hover:underline font-medium"
        >
          {entry.datasetName || `Dataset #${entry.datasetId}`}
          <ExternalLink size={11} className="opacity-60" />
        </a>
      </td>
      <td className="px-4 py-3">
        {readOnly ? (
          <span className="font-mono px-2 py-1 text-sm text-gray-700">{alias}</span>
        ) : (
          <input
            type="text"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            onBlur={() => { if (alias !== entry.localAlias) onUpdateAlias(entry.id, alias); }}
            className="font-mono rounded border border-transparent px-2 py-1 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200 hover:border-gray-200 w-36"
          />
        )}
      </td>
      <td className="px-4 py-3 text-gray-500 text-sm">
        {sizeDisplay}
        {entry.needsUpdate && (
          <span className="ml-2 inline-flex items-center gap-1 text-amber-500 text-xs">
            <AlertCircle size={11} /> stale
          </span>
        )}
      </td>
      <td className="px-4 py-3 font-mono text-xs text-gray-400 max-w-xs truncate">{preview}</td>
      {!readOnly && (
        <td className="px-4 py-3">
          <button
            onClick={() => onDelete(entry.id)}
            className="p-1.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 size={13} />
          </button>
        </td>
      )}
    </tr>
  );
}

// ── Browse view ───────────────────────────────────────────────────────────────

interface Breadcrumb { id: number | null; name: string; }

function BrowseView({
  existingDatasetIds,
  onBack,
  onSelect,
}: {
  existingDatasetIds: Set<number>;
  onBack:    () => void;
  onSelect:  (dataset: BrowseDataset) => Promise<void>;
}) {
  const [items,      setItems]      = useState<BrowseItem[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([{ id: null, name: "Home" }]);
  const [selected,   setSelected]   = useState<BrowseItem | null>(null);
  const [importing,  setImporting]  = useState(false);
  const [urlInput,   setUrlInput]   = useState("");
  const [urlError,   setUrlError]   = useState<string | null>(null);
  const [urlLoading, setUrlLoading] = useState(false);

  const currentId = breadcrumbs[breadcrumbs.length - 1].id;

  useEffect(() => {
    loadItems(currentId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadItems(parentId: number | null) {
    setLoading(true);
    setSelected(null);
    const param = parentId === null ? "" : `?parentId=${parentId}`;
    const res = await fetch(`/api/file-browse${param}`);
    setItems(res.ok ? await res.json() : []);
    setLoading(false);
  }

  function navigateInto(item: BrowseItem) {
    setBreadcrumbs((prev) => [...prev, { id: item.id, name: item.name }]);
    loadItems(item.id);
  }

  function navigateTo(idx: number) {
    const crumb = breadcrumbs[idx];
    setBreadcrumbs((prev) => prev.slice(0, idx + 1));
    loadItems(crumb.id);
  }

  async function handleUrlImport() {
    setUrlError(null);
    const trimmed = urlInput.trim();
    if (!trimmed) return;

    // Extract slug from URL like "/dataset/abc123XYZ_-" or just the slug directly
    const slugMatch = trimmed.match(/[A-Za-z0-9_-]{10}(?:[^A-Za-z0-9_-]|$)/);
    const slug = slugMatch ? slugMatch[0].replace(/[^A-Za-z0-9_-]/g, "") : trimmed.replace(/.*\//, "");

    if (!slug) { setUrlError("Could not find a valid dataset slug in that URL."); return; }

    setUrlLoading(true);
    try {
      const res = await fetch(`/api/file-browse/resolve?slug=${encodeURIComponent(slug)}`);
      if (!res.ok) { setUrlError("Dataset not found."); return; }
      const dataset: BrowseDataset = await res.json();
      if (existingDatasetIds.has(dataset.id)) { setUrlError("Already imported."); return; }
      setImporting(true);
      await onSelect(dataset);
    } catch {
      setUrlError("Failed to load dataset.");
    } finally {
      setUrlLoading(false);
      setImporting(false);
    }
  }

  async function confirmImport() {
    if (!selected || selected.fileTypeId !== "Dataset") return;
    setImporting(true);
    // Fetch dataset info (name + datapoint count) via the same resolve endpoint
    const res = await fetch(`/api/file-browse/resolve?id=${selected.id}`);
    if (res.ok) {
      const dataset: BrowseDataset = await res.json();
      await onSelect(dataset);
    }
    setImporting(false);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar: back + breadcrumbs + URL input */}
      <div className="shrink-0 px-6 py-3 border-b border-gray-100 flex items-center gap-4">
        <button
          onClick={onBack}
          className="text-sm text-gray-500 hover:text-gray-800 shrink-0 flex items-center gap-1"
        >
          ← Back
        </button>

        {/* Breadcrumbs */}
        <div className="flex items-center gap-1 text-sm text-gray-500 flex-1 min-w-0 overflow-hidden">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <ChevronRight size={12} className="shrink-0 text-gray-300" />}
              <button
                onClick={() => navigateTo(idx)}
                className={`flex items-center gap-1 shrink-0 hover:text-blue-600 truncate max-w-[160px] ${
                  idx === breadcrumbs.length - 1 ? "text-gray-800 font-medium" : "hover:underline"
                }`}
              >
                {idx === 0 && <Home size={12} />}
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* URL input */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <Link size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={urlInput}
              onChange={(e) => { setUrlInput(e.target.value); setUrlError(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleUrlImport(); }}
              placeholder="Paste dataset URL…"
              className="pl-8 pr-3 py-1.5 w-56 rounded-md border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <button
            onClick={handleUrlImport}
            disabled={!urlInput.trim() || urlLoading}
            className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {urlLoading ? <RefreshCw size={13} className="animate-spin" /> : "Import"}
          </button>
        </div>
      </div>

      {urlError && (
        <p className="px-6 py-2 text-sm text-red-500 bg-red-50 border-b border-red-100">{urlError}</p>
      )}

      {/* File list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-gray-400">
            <RefreshCw size={16} className="animate-spin mr-2" /> Loading…
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">This folder is empty.</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left sticky top-0">
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => {
                const isDataset   = item.fileTypeId === "Dataset";
                const isFolder    = item.fileTypeId === "Folder" || item.fileTypeId === "Workspace";
                const alreadyDone = isDataset && existingDatasetIds.has(item.id);
                const isSelected  = selected?.id === item.id;

                return (
                  <tr
                    key={item.id}
                    onClick={() => {
                      if (isFolder) { navigateInto(item); return; }
                      if (isDataset && !alreadyDone) setSelected(isSelected ? null : item);
                    }}
                    className={`transition-colors ${
                      alreadyDone
                        ? "opacity-40 cursor-not-allowed"
                        : isFolder
                          ? "cursor-pointer hover:bg-gray-50"
                          : isSelected
                            ? "bg-blue-50 cursor-pointer"
                            : "cursor-pointer hover:bg-gray-50"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isFolder
                          ? <Folder size={15} className="text-amber-400 shrink-0" />
                          : <Database size={15} className="text-blue-400 shrink-0" />
                        }
                        <span className={isFolder ? "font-medium text-gray-700" : "text-gray-800"}>
                          {item.name}
                        </span>
                        {isFolder && <ChevronRight size={13} className="text-gray-300 ml-auto" />}
                        {alreadyDone && <span className="ml-2 text-xs text-gray-400 italic">already imported</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {isFolder ? "Folder" : "Dataset"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-gray-200 px-6 py-3 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {selected
            ? <>Selected: <span className="font-medium text-gray-800">{selected.name}</span></>
            : "Click a folder to navigate, or a dataset to select it."}
        </p>
        <button
          onClick={confirmImport}
          disabled={!selected || importing}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {importing
            ? <><RefreshCw size={13} className="animate-spin" /> Importing…</>
            : <><Plus size={14} /> Import Dataset</>}
        </button>
      </div>
    </div>
  );
}
