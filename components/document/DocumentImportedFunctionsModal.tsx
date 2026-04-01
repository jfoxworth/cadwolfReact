"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  X, Plus, Trash2, ArrowLeft, Package,
  RefreshCw, ExternalLink, ChevronRight,
  FileText, Folder, LogIn, LogOut,
} from "lucide-react";
import type { ImportedFunction, FunctionPort } from "@/types/item";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BrowseFile {
  id:         number;
  name:       string;
  fileTypeId: string; // "Workspace" | "Folder" | "Document"
}

interface FunctionDetail {
  name:    string;
  inputs:  FunctionPort[];
  outputs: FunctionPort[];
}

interface BreadcrumbEntry { id: number | null; name: string }

interface DocumentImportedFunctionsModalProps {
  importedFunctions: ImportedFunction[];
  onClose:   () => void;
  onChanged: (fns: ImportedFunction[]) => void;
  readOnly?: boolean;
}

type View = "list" | "browse";

// ── Main component ────────────────────────────────────────────────────────────

export default function DocumentImportedFunctionsModal({
  importedFunctions: initial,
  onClose,
  onChanged,
  readOnly = false,
}: DocumentImportedFunctionsModalProps) {
  const [fns,  setFns]  = useState<ImportedFunction[]>(initial);
  const [view, setView] = useState<View>("list");
  const backdropRef = useRef<HTMLDivElement>(null);

  function updateAlias(sourceFileId: number, localAlias: string) {
    const next = fns.map((f) => f.sourceFileId === sourceFileId ? { ...f, localAlias } : f);
    setFns(next);
    onChanged(next);
  }

  function remove(sourceFileId: number) {
    const next = fns.filter((f) => f.sourceFileId !== sourceFileId);
    setFns(next);
    onChanged(next);
  }

  function handleImport(file: BrowseFile, detail: FunctionDetail) {
    const localAlias = file.name.replace(/\s+/g, "_").replace(/[^A-Za-z0-9_]/g, "");
    const entry: ImportedFunction = {
      sourceFileId:   file.id,
      sourceFileName: file.name,
      localAlias,
      inputs:         detail.inputs,
      outputs:        detail.outputs,
    };
    const next = [...fns, entry];
    setFns(next);
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
        style={{ width: "min(90vw, 900px)", maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Imported Functions</h2>
            <p className="text-sm text-gray-500 mt-1">
              Import other documents as callable functions. Use the local alias to call them in equations.
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
              fns={fns}
              onUpdateAlias={updateAlias}
              onRemove={remove}
              onAddClick={() => !readOnly && setView("browse")}
              onClose={onClose}
              readOnly={readOnly}
            />
          ) : (
            <BrowseView
              existingIds={new Set(fns.map((f) => f.sourceFileId))}
              onBack={() => setView("list")}
              onSelect={(file, detail) => handleImport(file, detail)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── List view ─────────────────────────────────────────────────────────────────

function ListView({
  fns, onUpdateAlias, onRemove, onAddClick, onClose, readOnly,
}: {
  fns:           ImportedFunction[];
  onUpdateAlias: (id: number, alias: string) => void;
  onRemove:      (id: number) => void;
  onAddClick:    () => void;
  onClose:       () => void;
  readOnly?:     boolean;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {fns.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
            <Package size={32} className="opacity-30" />
            <p className="text-sm">No functions imported yet.</p>
            {!readOnly && (
              <button
                onClick={onAddClick}
                className="mt-2 flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
              >
                <Plus size={14} /> Import a Function
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {fns.map((fn) => (
              <FunctionRow
                key={fn.sourceFileId}
                fn={fn}
                onUpdateAlias={onUpdateAlias}
                onRemove={onRemove}
                readOnly={readOnly}
              />
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-gray-200 px-6 py-3 flex justify-between items-center">
        {!readOnly && fns.length > 0 ? (
          <button
            onClick={onAddClick}
            className="flex items-center gap-2 px-4 py-2 rounded-md border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
          >
            <Plus size={14} /> Add Function
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

// ── Function row ──────────────────────────────────────────────────────────────

function FunctionRow({
  fn, onUpdateAlias, onRemove, readOnly,
}: {
  fn:            ImportedFunction;
  onUpdateAlias: (id: number, alias: string) => void;
  onRemove:      (id: number) => void;
  readOnly?:     boolean;
}) {
  const [alias, setAlias] = useState(fn.localAlias);

  return (
    <div className="px-6 py-4 hover:bg-gray-50 group">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Source file link + alias */}
          <div className="flex items-center gap-3 flex-wrap">
            <a
              href={`/document/${fn.sourceFileId}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-blue-600 hover:underline font-medium text-sm"
            >
              {fn.sourceFileName || `Document #${fn.sourceFileId}`}
              <ExternalLink size={11} className="opacity-60 shrink-0" />
            </a>
            <span className="text-gray-300 text-xs">→ alias:</span>
            {readOnly ? (
              <span className="font-mono px-2 py-0.5 text-sm text-gray-700">{alias}</span>
            ) : (
              <input
                type="text"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                onBlur={() => { if (alias !== fn.localAlias) onUpdateAlias(fn.sourceFileId, alias); }}
                className="font-mono rounded border border-transparent px-2 py-0.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200 hover:border-gray-200 w-36"
              />
            )}
          </div>

          {/* Ports summary */}
          <div className="mt-2 flex flex-wrap gap-4">
            <PortBadges label="Inputs" icon={LogIn} ports={fn.inputs} color="blue" />
            <PortBadges label="Outputs" icon={LogOut} ports={fn.outputs} color="emerald" />
          </div>
        </div>

        {!readOnly && (
          <button
            onClick={() => onRemove(fn.sourceFileId)}
            className="mt-1 p-1.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

function PortBadges({
  label, icon: Icon, ports, color,
}: {
  label:  string;
  icon:   React.ElementType;
  ports:  FunctionPort[];
  color:  "blue" | "emerald";
}) {
  const cls = color === "blue"
    ? { text: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" }
    : { text: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" };

  if (ports.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Icon size={12} className={`${cls.text} shrink-0`} />
      {ports.map((p) => (
        <span
          key={p.variableName}
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono border ${cls.bg} ${cls.border} ${cls.text}`}
          title={p.description || p.unit || undefined}
        >
          {p.variableName}{p.unit ? ` [${p.unit}]` : ""}
        </span>
      ))}
    </div>
  );
}

// ── Browse view ───────────────────────────────────────────────────────────────

function BrowseView({
  existingIds,
  onBack,
  onSelect,
}: {
  existingIds: Set<number>;
  onBack:      () => void;
  onSelect:    (file: BrowseFile, detail: FunctionDetail) => void;
}) {
  const [breadcrumbs,  setBreadcrumbs]  = useState<BreadcrumbEntry[]>([{ id: null, name: "Workspaces" }]);
  const [files,        setFiles]        = useState<BrowseFile[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [selectedDoc,  setSelectedDoc]  = useState<BrowseFile | null>(null);
  const [detail,       setDetail]       = useState<FunctionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadFiles = useCallback(async (parentId: number | null) => {
    setLoading(true);
    setSelectedDoc(null);
    setDetail(null);
    const res = await fetch(`/api/file-browse?parentId=${parentId ?? "null"}`);
    setFiles(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { loadFiles(null); }, [loadFiles]);

  function navigateTo(file: BrowseFile) {
    if (file.fileTypeId === "Document") {
      setSelectedDoc(file);
      setDetail(null);
      setDetailLoading(true);
      fetch(`/api/file/${file.id}/function-settings`)
        .then((r) => r.json())
        .then((d: FunctionDetail | null) => { setDetail(d); setDetailLoading(false); });
    } else {
      setBreadcrumbs((prev) => [...prev, { id: file.id, name: file.name }]);
      loadFiles(file.id);
    }
  }

  function navigateBreadcrumb(idx: number) {
    const crumb = breadcrumbs[idx];
    setBreadcrumbs((prev) => prev.slice(0, idx + 1));
    loadFiles(crumb.id);
  }

  const alreadyImported = selectedDoc ? existingIds.has(selectedDoc.id) : false;
  const canImport = selectedDoc && detail && !alreadyImported;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
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
          {/* Breadcrumbs */}
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
                  const isDoc      = f.fileTypeId === "Document";
                  const isSelected = selectedDoc?.id === f.id;
                  return (
                    <li key={f.id}>
                      <button
                        onClick={() => navigateTo(f)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                          isSelected ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50 text-gray-700"
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

        {/* Right: function detail */}
        <div className="w-1/2 flex flex-col min-h-0">
          {!selectedDoc ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
              <Package size={28} className="opacity-30" />
              <p className="text-sm">Select a document to see its function interface.</p>
            </div>
          ) : detailLoading ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <RefreshCw size={16} className="animate-spin mr-2" /> Loading…
            </div>
          ) : !detail ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2 px-6 text-center">
              <Package size={28} className="opacity-30" />
              <p className="text-sm">This document has no function interface defined.</p>
              <p className="text-xs">Open it and use <span className="font-semibold">File as a Function</span> to define inputs and outputs.</p>
            </div>
          ) : (
            <>
              <div className="shrink-0 px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide truncate">{selectedDoc.name}</p>
                <a
                  href={`/document/${selectedDoc.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-500 hover:text-blue-700 shrink-0 ml-2"
                >
                  <ExternalLink size={12} />
                </a>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                <PortSection label="Inputs" icon={LogIn} ports={detail.inputs} color="blue" />
                <PortSection label="Outputs" icon={LogOut} ports={detail.outputs} color="emerald" />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-gray-200 px-6 py-3 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {alreadyImported
            ? "Already imported."
            : selectedDoc && detail
              ? <>Selected: <span className="font-medium text-gray-800">{selectedDoc.name}</span></>
              : "Select a document with a function interface."}
        </p>
        <button
          onClick={() => canImport && onSelect(selectedDoc!, detail!)}
          disabled={!canImport}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus size={14} /> Import Function
        </button>
      </div>
    </div>
  );
}

function PortSection({
  label, icon: Icon, ports, color,
}: {
  label:  string;
  icon:   React.ElementType;
  ports:  FunctionPort[];
  color:  "blue" | "emerald";
}) {
  const cls = color === "blue"
    ? { text: "text-blue-600", tag: "text-blue-700 bg-blue-50 border-blue-200" }
    : { text: "text-emerald-600", tag: "text-emerald-700 bg-emerald-50 border-emerald-200" };
  return (
    <div>
      <div className={`flex items-center gap-1.5 text-xs font-semibold mb-2 ${cls.text}`}>
        <Icon size={12} /> {label}
      </div>
      {ports.length === 0 ? (
        <p className="text-xs text-gray-400">None</p>
      ) : (
        <div className="space-y-1.5">
          {ports.map((p) => (
            <div key={p.variableName} className="flex items-center gap-2 text-sm flex-wrap">
              <span className={`font-mono text-xs border rounded px-2 py-0.5 ${cls.tag}`}>{p.variableName}</span>
              {p.unit && <span className="text-gray-400 text-xs">[{p.unit}]</span>}
              {p.description && <span className="text-gray-500 text-xs">{p.description}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
