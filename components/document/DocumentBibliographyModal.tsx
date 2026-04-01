"use client";

import React, { useState } from "react";
import { X, Plus, Trash2, BookOpen, ExternalLink } from "lucide-react";

export interface BibEntry {
  id:      number;
  authors: string;
  title:   string;
  year:    number | null;
  source:  string | null;
  url:     string | null;
  doi:     string | null;
  note:    string | null;
  order:   number;
}

interface DocumentBibliographyModalProps {
  fileId:  number;
  entries: BibEntry[];
  onClose: () => void;
  /** Called after any mutation so parent can refresh */
  onChanged: (entries: BibEntry[]) => void;
  readOnly?: boolean;
}

const EMPTY_DRAFT = () => ({
  authors: "",
  title:   "",
  year:    "" as string | number,
  source:  "",
  url:     "",
  doi:     "",
  note:    "",
});

type Draft = ReturnType<typeof EMPTY_DRAFT>;

function Field({
  label, value, onChange, placeholder, mono = false, wide = false,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <input
        type="text"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${mono ? "font-mono" : ""}`}
      />
    </div>
  );
}

export default function DocumentBibliographyModal({
  fileId,
  entries: initialEntries,
  onClose,
  onChanged,
  readOnly = false,
}: DocumentBibliographyModalProps) {
  const [entries, setEntries] = useState<BibEntry[]>(initialEntries);
  const [adding,  setAdding]  = useState(false);
  const [draft,   setDraft]   = useState<Draft>(EMPTY_DRAFT());
  const [saving,  setSaving]  = useState(false);

  const backdropRef = React.useRef<HTMLDivElement>(null);

  // ── helpers ────────────────────────────────────────────────────────────────

  const updateDraft = (field: keyof Draft, value: string) =>
    setDraft((d) => ({ ...d, [field]: value }));

  async function addEntry() {
    setSaving(true);
    const res = await fetch("/api/bibliography", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileId,
        authors: draft.authors,
        title:   draft.title,
        year:    draft.year !== "" ? Number(draft.year) : null,
        source:  draft.source  || null,
        url:     draft.url     || null,
        doi:     draft.doi     || null,
        note:    draft.note    || null,
      }),
    });
    const created: BibEntry = await res.json();
    const next = [...entries, created];
    setEntries(next);
    onChanged(next);
    setDraft(EMPTY_DRAFT());
    setAdding(false);
    setSaving(false);
  }

  async function deleteEntry(id: number) {
    await fetch(`/api/bibliography/${id}`, { method: "DELETE" });
    const next = entries.filter((e) => e.id !== id);
    setEntries(next);
    onChanged(next);
  }

  async function updateField(id: number, field: keyof BibEntry, value: string | number | null) {
    await fetch(`/api/bibliography/${id}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    const next = entries.map((e) => e.id === id ? { ...e, [field]: value } : e);
    setEntries(next);
    onChanged(next);
  }

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Bibliography</h2>
            <p className="text-sm text-gray-500 mt-1">
              Add references cited in this document. Changes are saved immediately.
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
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-3">

          {/* Existing entries */}
          {entries.length === 0 && !adding && (
            <p className="text-sm text-center text-gray-400 py-6">
              No references yet. Click &quot;Add Reference&quot; to get started.
            </p>
          )}

          {entries.map((entry, idx) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              index={idx}
              onDelete={deleteEntry}
              onUpdate={updateField}
              readOnly={readOnly}
            />
          ))}

          {/* New-entry form */}
          {adding && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">New Reference</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Authors"      value={draft.authors} onChange={(v) => updateDraft("authors", v)} placeholder="Smith, J.; Doe, A." wide />
                <Field label="Title"        value={draft.title}   onChange={(v) => updateDraft("title", v)}   placeholder="Title of the work" wide />
                <Field label="Year"         value={draft.year}    onChange={(v) => updateDraft("year", v)}    placeholder="2024" />
                <Field label="Journal / Source" value={draft.source ?? ""} onChange={(v) => updateDraft("source", v)} placeholder="Journal of Engineering" />
                <Field label="URL"          value={draft.url ?? ""} onChange={(v) => updateDraft("url", v)}   placeholder="https://…" mono />
                <Field label="DOI"          value={draft.doi ?? ""} onChange={(v) => updateDraft("doi", v)}   placeholder="10.xxxx/…" mono />
                <Field label="Note"         value={draft.note ?? ""} onChange={(v) => updateDraft("note", v)} placeholder="Optional note" wide />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={addEntry}
                  disabled={saving || !draft.title.trim()}
                  className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save Reference"}
                </button>
                <button
                  onClick={() => { setAdding(false); setDraft(EMPTY_DRAFT()); }}
                  className="px-3 py-1.5 rounded-md text-sm text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
          {!readOnly ? (
            <button
              onClick={() => { setAdding(true); setDraft(EMPTY_DRAFT()); }}
              disabled={adding}
              className="flex items-center gap-2 px-4 py-2 rounded-md border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              <Plus size={14} />
              Add Reference
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
    </div>
  );
}

// ── Editable entry row ───────────────────────────────────────────────────────

function EntryRow({
  entry, index, onDelete, onUpdate, readOnly,
}: {
  entry:    BibEntry;
  index:    number;
  onDelete: (id: number) => void;
  onUpdate: (id: number, field: keyof BibEntry, value: string | number | null) => void;
  readOnly?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const num = `[${index + 1}]`;

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {/* Collapsed row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-xs font-mono text-gray-400 w-6 shrink-0">{num}</span>
        <BookOpen size={14} className="shrink-0 text-gray-300" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{entry.title || <em className="text-gray-400">Untitled</em>}</p>
          <p className="text-xs text-gray-500 truncate">
            {[entry.authors, entry.year].filter(Boolean).join(" · ")}
            {entry.source ? ` — ${entry.source}` : ""}
          </p>
        </div>
        {entry.url && (
          <a href={entry.url} target="_blank" rel="noreferrer" className="p-1 text-gray-300 hover:text-blue-500" title="Open URL">
            <ExternalLink size={13} />
          </a>
        )}
        {!readOnly && (
          <>
            <button
              onClick={() => setExpanded((x) => !x)}
              className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
            >
              {expanded ? "Close" : "Edit"}
            </button>
            <button
              onClick={() => onDelete(entry.id)}
              className="p-1.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50"
            >
              <Trash2 size={13} />
            </button>
          </>
        )}
      </div>

      {/* Expanded edit grid */}
      {expanded && !readOnly && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 grid grid-cols-2 gap-3">
          <InlineField label="Authors"   value={entry.authors} onBlur={(v) => onUpdate(entry.id, "authors", v)} placeholder="Smith, J." wide />
          <InlineField label="Title"     value={entry.title}   onBlur={(v) => onUpdate(entry.id, "title", v)}   placeholder="Title" wide />
          <InlineField label="Year"      value={entry.year ?? ""} onBlur={(v) => onUpdate(entry.id, "year", v ? Number(v) : null)} placeholder="2024" />
          <InlineField label="Journal / Source" value={entry.source ?? ""} onBlur={(v) => onUpdate(entry.id, "source", v || null)} placeholder="Journal" />
          <InlineField label="URL"  value={entry.url ?? ""}  onBlur={(v) => onUpdate(entry.id, "url",  v || null)} placeholder="https://…" mono />
          <InlineField label="DOI"  value={entry.doi ?? ""}  onBlur={(v) => onUpdate(entry.id, "doi",  v || null)} placeholder="10.xxxx/…" mono />
          <InlineField label="Note" value={entry.note ?? ""} onBlur={(v) => onUpdate(entry.id, "note", v || null)} placeholder="Optional note" wide />
        </div>
      )}
    </div>
  );
}

function InlineField({
  label, value, onBlur, placeholder, mono = false, wide = false,
}: {
  label: string;
  value: string | number;
  onBlur: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
  wide?: boolean;
}) {
  const [local, setLocal] = useState(String(value ?? ""));

  return (
    <div className={wide ? "col-span-2" : ""}>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <input
        type="text"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => onBlur(local)}
        placeholder={placeholder}
        className={`w-full rounded border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${mono ? "font-mono" : ""}`}
      />
    </div>
  );
}
