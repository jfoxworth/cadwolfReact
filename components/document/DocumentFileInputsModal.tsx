"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X, Plus, Trash2, ChevronRight, ArrowLeft, FileText,
  Folder, RefreshCw, ExternalLink, Check,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

export interface FileImportEntry {
  id:                 number;
  sourceFileId:       number;
  sourceFileName:     string;
  sourceFileSlug:     string | null;
  sourceVariableName: string;
  localAlias:         string;
  value:              string | null;
  units:              string | null;
  needsUpdate:        boolean;
  order:              number;
}

interface BrowseFile {
  id:         number;
  name:       string;
  fileTypeId: string;  // "Workspace" | "Folder" | "Document"
  slug:       string | null;
  parentId:   number | null;
}

interface ParsedVariable {
  componentId:  number;
  variableName: string;
  displayRaw:   string;
  value:        string | null;
  units:        string | null;
}

// Minimal slice of a solved result needed by this modal
export interface SolvedImportResult {
  size:  string;          // e.g. "1x1", "3x1"
  real:  Record<string, number>;
  units: string;          // display unit string
}

interface DocumentFileInputsModalProps {
  fileId:        number;
  entries:       FileImportEntry[];
  solverResults: Map<string, SolvedImportResult | null>;
  onClose:       () => void;
  onChanged:     (entries: FileImportEntry[]) => void;
  readOnly?:     boolean;
}

function formatSolvedValue(result: SolvedImportResult | null | undefined): string | null {
  if (!result) return null;
  const { size, real } = result;
  if (size === "1x1") {
    const v = real["0-0"] ?? 0;
    // Format: up to 6 significant figures, strip trailing zeros
    return parseFloat(v.toPrecision(6)).toString();
  }
  return `[${size}]`;
}

function formatSolvedUnits(result: SolvedImportResult | null | undefined, fallback: string | null): string | null {
  if (result?.units) return result.units;
  return fallback ?? null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

type View = "list" | "browse";

interface BreadcrumbEntry { id: number | null; name: string }

// ── Main component ────────────────────────────────────────────────────────────

export default function DocumentFileInputsModal({
  fileId,
  entries: initialEntries,
  solverResults,
  onClose,
  onChanged,
  readOnly = false,
}: DocumentFileInputsModalProps) {
  const [entries, setEntries] = useState<FileImportEntry[]>(initialEntries);
  const [view,    setView]    = useState<View>("list");
  const backdropRef = React.useRef<HTMLDivElement>(null);

  // ── Alias inline-edit ─────────────────────────────────────────────────────

  async function updateAlias(id: number, localAlias: string) {
    await fetch(`/api/file-import/${id}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ localAlias }),
    });
    const next = entries.map((e) => e.id === id ? { ...e, localAlias } : e);
    setEntries(next);
    onChanged(next);
  }

  async function deleteEntry(id: number) {
    await fetch(`/api/file-import/${id}`, { method: "DELETE" });
    const next = entries.filter((e) => e.id !== id);
    setEntries(next);
    onChanged(next);
  }

  async function handleImportSelected(variable: ParsedVariable, sourceFile: BrowseFile) {
    const res = await fetch("/api/file-import", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        fileId,
        sourceFileId:       sourceFile.id,
        sourceFileName:     sourceFile.name,
        sourceFileSlug:     sourceFile.slug,
        sourceVariableName: variable.variableName,
        localAlias:         variable.variableName,
        value:              variable.value,
        units:              variable.units,
      }),
    });
    const created: FileImportEntry = await res.json();
    const next = [...entries, created];
    setEntries(next);
    onChanged(next);
    setView("list");
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div className="relative bg-white rounded-xl shadow-2xl flex flex-col"
        style={{ width: "min(90vw, 900px)", maxHeight: "90vh" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">File Inputs</h2>
            <p className="text-sm text-gray-500 mt-1">
              Variables imported from other documents. Imported variables are available to all equations in this document.
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 flex flex-col">
          {view === "list" ? (
            <ListView
              entries={entries}
              solverResults={solverResults}
              onUpdateAlias={updateAlias}
              onDelete={deleteEntry}
              onAddClick={() => !readOnly && setView("browse")}
              onDone={onClose}
              readOnly={readOnly}
            />
          ) : (
            <BrowseView
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
  entries, solverResults, onUpdateAlias, onDelete, onAddClick, onDone, readOnly,
}: {
  entries:        FileImportEntry[];
  solverResults:  Map<string, SolvedImportResult | null>;
  onUpdateAlias:  (id: number, alias: string) => void;
  onDelete:       (id: number) => void;
  onDone:         () => void;
  onAddClick:     () => void;
  readOnly?:      boolean;
}) {
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Table */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
            <FileText size={32} className="opacity-30" />
            <p className="text-sm">No variables imported yet.</p>
            {!readOnly && (
              <button
                onClick={onAddClick}
                className="mt-2 flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
              >
                <Plus size={14} /> Import a Variable
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left">
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Source Document</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Source Variable</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Local Alias</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cached Value</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Units</th>
                {!readOnly && <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-8"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((e) => (
                <ImportRow
                  key={e.id}
                  entry={e}
                  solvedResult={solverResults.get(`import-${e.id}`) ?? null}
                  onUpdateAlias={onUpdateAlias}
                  onDelete={onDelete}
                  readOnly={readOnly}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-gray-200 px-6 py-3 flex justify-between items-center">
        {!readOnly && entries.length > 0 ? (
          <button
            onClick={onAddClick}
            className="flex items-center gap-2 px-4 py-2 rounded-md border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
          >
            <Plus size={14} /> Add Import
          </button>
        ) : <span />}
        <button onClick={onDone} className="px-4 py-2 rounded-md bg-gray-900 text-white text-sm font-medium hover:bg-gray-700">
          {readOnly ? "Close" : "Done"}
        </button>
      </div>
    </div>
  );
}

// ── Import row ─────────────────────────────────────────────────────────────────

function ImportRow({
  entry, solvedResult, onUpdateAlias, onDelete, readOnly,
}: {
  entry:          FileImportEntry;
  solvedResult:   SolvedImportResult | null;
  onUpdateAlias:  (id: number, alias: string) => void;
  onDelete:       (id: number) => void;
  readOnly?:      boolean;
}) {
  const [alias, setAlias] = useState(entry.localAlias);

  return (
    <tr className="hover:bg-gray-50 group">
      {/* Source file */}
      <td className="px-4 py-3">
        <a
          href={`/document/${entry.sourceFileSlug ?? entry.sourceFileId}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-blue-600 hover:underline font-medium"
        >
          {entry.sourceFileName || `Document #${entry.sourceFileId}`}
          <ExternalLink size={11} className="opacity-60" />
        </a>
      </td>

      {/* Source variable */}
      <td className="px-4 py-3">
        <span className="font-mono text-gray-700">{entry.sourceVariableName}</span>
      </td>

      {/* Local alias */}
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

      {/* Cached value */}
      <td className="px-4 py-3">
        <span className="text-gray-600 font-mono text-xs">
          {(() => {
            const display = formatSolvedValue(solvedResult);
            if (display) return display;
            if (entry.value) return entry.value;
            return <span className="text-gray-300 italic">—</span>;
          })()}
        </span>
      </td>

      {/* Units */}
      <td className="px-4 py-3">
        <span className="text-gray-500 font-mono text-xs">
          {formatSolvedUnits(solvedResult, entry.units) ?? <span className="text-gray-300 italic">—</span>}
        </span>
      </td>

      {/* Delete */}
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

function BrowseView({
  onBack,
  onSelect,
}: {
  onBack:    () => void;
  onSelect:  (variable: ParsedVariable, sourceFile: BrowseFile) => void;
}) {
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbEntry[]>([{ id: null, name: "Workspaces" }]);
  const [files,       setFiles]       = useState<BrowseFile[]>([]);
  const [loading,     setLoading]     = useState(false);

  // When a document is selected for variable picking
  const [selectedDoc, setSelectedDoc] = useState<BrowseFile | null>(null);
  const [variables,   setVariables]   = useState<ParsedVariable[]>([]);
  const [varsLoading, setVarsLoading] = useState(false);
  const [selectedVar, setSelectedVar] = useState<ParsedVariable | null>(null);

  const loadFiles = useCallback(async (parentId: number | null) => {
    setLoading(true);
    setSelectedDoc(null);
    setVariables([]);
    setSelectedVar(null);
    const res = await fetch(`/api/file-browse?parentId=${parentId ?? "null"}`);
    setFiles(await res.json());
    setLoading(false);
  }, []);

  // Load root on mount
  useEffect(() => { loadFiles(null); }, [loadFiles]);

  function navigateTo(file: BrowseFile) {
    if (file.fileTypeId === "Document") {
      // Show variable picker for this document
      setSelectedDoc(file);
      setSelectedVar(null);
      setVarsLoading(true);
      fetch(`/api/file-browse/${file.id}/variables`)
        .then((r) => r.json())
        .then((vars: ParsedVariable[]) => { setVariables(vars); setVarsLoading(false); });
    } else {
      // Drill into folder / workspace
      setBreadcrumbs((prev) => [...prev, { id: file.id, name: file.name }]);
      loadFiles(file.id);
    }
  }

  function navigateBreadcrumb(idx: number) {
    const crumb = breadcrumbs[idx];
    setBreadcrumbs((prev) => prev.slice(0, idx + 1));
    loadFiles(crumb.id);
  }

  function confirmImport() {
    if (selectedVar && selectedDoc) {
      onSelect(selectedVar, selectedDoc);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Browse header */}
      <div className="shrink-0 px-6 py-3 border-b border-gray-100 flex items-center gap-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft size={14} /> Back to imports
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left: file browser */}
        <div className="w-1/2 border-r border-gray-100 flex flex-col min-h-0">
          {/* Breadcrumbs + Up button */}
          <div className="shrink-0 flex items-center gap-1 px-4 py-2 text-xs text-gray-500 border-b border-gray-100 flex-wrap">
            {breadcrumbs.length > 1 && (
              <button
                onClick={() => navigateBreadcrumb(breadcrumbs.length - 2)}
                className="mr-1 p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                title="Up to parent"
              >
                <ArrowLeft size={13} />
              </button>
            )}
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight size={12} className="text-gray-300" />}
                <button
                  onClick={() => navigateBreadcrumb(idx)}
                  className={`hover:text-gray-800 transition-colors ${idx === breadcrumbs.length - 1 ? "text-gray-800 font-medium" : "hover:underline"}`}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* File list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-24 text-gray-400">
                <RefreshCw size={16} className="animate-spin mr-2" /> Loading…
              </div>
            ) : files.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">Nothing here.</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {files.map((f) => {
                  const isDoc = f.fileTypeId === "Document";
                  const isSelected = selectedDoc?.id === f.id;
                  return (
                    <li key={f.id}>
                      <button
                        onClick={() => navigateTo(f)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                          isSelected
                            ? "bg-blue-50 text-blue-700"
                            : "hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        {isDoc ? (
                          <FileText size={15} className={`shrink-0 ${isSelected ? "text-blue-500" : "text-gray-400"}`} />
                        ) : (
                          <Folder size={15} className="shrink-0 text-amber-400" />
                        )}
                        <span className="flex-1 truncate">{f.name}</span>
                        {!isDoc && <ChevronRight size={13} className="text-gray-300 shrink-0" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Right: variable picker */}
        <div className="w-1/2 flex flex-col min-h-0">
          {!selectedDoc ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
              <FileText size={28} className="opacity-20" />
              <p className="text-sm">Select a document to browse its variables.</p>
            </div>
          ) : (
            <>
              <div className="shrink-0 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide truncate">
                  {selectedDoc.name}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {varsLoading ? (
                  <div className="flex items-center justify-center h-24 text-gray-400">
                    <RefreshCw size={16} className="animate-spin mr-2" /> Loading…
                  </div>
                ) : variables.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-10">No equation variables found.</p>
                ) : (
                  <ul className="divide-y divide-gray-50">
                    {variables.map((v) => {
                      const isSelected = selectedVar?.componentId === v.componentId;
                      return (
                        <li key={v.componentId}>
                          <button
                            onClick={() => setSelectedVar(isSelected ? null : v)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                              isSelected
                                ? "bg-blue-50"
                                : "hover:bg-gray-50"
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                              isSelected ? "bg-blue-600 border-blue-600" : "border-gray-300"
                            }`}>
                              {isSelected && <Check size={10} className="text-white" />}
                            </div>
                            <span className={`font-mono font-medium ${isSelected ? "text-blue-700" : "text-gray-800"}`}>
                              {v.variableName}
                            </span>
                            <span className="flex-1 text-gray-400 text-xs truncate font-mono">
                              {v.displayRaw.includes("=") ? v.displayRaw.split("=").slice(1).join("=").trim() : v.value}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Browse footer */}
      <div className="shrink-0 border-t border-gray-200 px-6 py-3 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {selectedVar
            ? <>Selected: <span className="font-mono font-medium text-gray-800">{selectedVar.variableName}</span> from <span className="font-medium text-gray-800">{selectedDoc?.name}</span></>
            : "Select a variable from the right panel."}
        </p>
        <button
          onClick={confirmImport}
          disabled={!selectedVar}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus size={14} /> Import Variable
        </button>
      </div>
    </div>
  );
}
