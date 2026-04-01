"use client";

import { useState, useEffect } from "react";
import { X, Search, Loader2 } from "lucide-react";

interface OnshapeDoc {
  id: string;
  name: string;
  defaultWorkspace: { id: string };
}

interface OnshapeElement {
  id: string;
  name: string;
  type: string;
  thumbnailInfo?: {
    sizes: Array<{ size: string; href: string }>;
  };
}

interface Props {
  itemId: string;
  itemName: string;
  onClose: () => void;
  onSaved: (itemId: string, conn: { documentId: string; workspaceId: string; elementId: string; elementName?: string; thumbnailUrl?: string }) => void;
}

export default function PartTreeCadModal({ itemId, itemName, onClose, onSaved }: Props) {
  const [search, setSearch] = useState("");
  const [docs, setDocs] = useState<OnshapeDoc[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<OnshapeDoc | null>(null);
  const [elements, setElements] = useState<OnshapeElement[]>([]);
  const [elementsLoading, setElementsLoading] = useState(false);
  const [elementsError, setElementsError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Load documents (re-fetch when search changes, debounced)
  useEffect(() => {
    setDocsLoading(true);
    setDocsError(null);
    const timer = setTimeout(() => {
      const url = search ? `/api/onshape/documents?search=${encodeURIComponent(search)}` : "/api/onshape/documents";
      fetch(url)
        .then((r) => r.json())
        .then((data) => {
          if (data?.error) { setDocsError(data.error); return; }
          setDocs(Array.isArray(data) ? data : []);
        })
        .catch((e) => setDocsError(String(e)))
        .finally(() => setDocsLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load elements when a doc is selected
  useEffect(() => {
    if (!selectedDoc) return;
    setElementsLoading(true);
    setElements([]);
    setElementsError(null);
    fetch(`/api/onshape/document/${selectedDoc.id}/elements?workspaceId=${selectedDoc.defaultWorkspace.id}&withThumbnails=true`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.error) { setElementsError(data.error); return; }
        setElements(Array.isArray(data) ? data : []);
      })
      .catch((e) => setElementsError(String(e)))
      .finally(() => setElementsLoading(false));
  }, [selectedDoc]);

  const filteredDocs = docs;

  async function handleSelectElement(element: OnshapeElement) {
    if (!selectedDoc || saving) return;
    setSaving(true);

    const thumbnailUrl = element.thumbnailInfo?.sizes?.[0]?.href;

    const info = {
      documentId: selectedDoc.id,
      workspaceId: selectedDoc.defaultWorkspace.id,
      elementId: element.id,
      elementName: element.name,
      element_data: { thumbnailInfo: element.thumbnailInfo ?? null },
    };

    const res = await fetch("/api/cad-connection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileId: Number(itemId), cadType: "onshape", info }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(`Failed to save: ${data.error ?? res.status}`);
      setSaving(false);
      return;
    }

    onSaved(itemId, {
      documentId: selectedDoc.id,
      workspaceId: selectedDoc.defaultWorkspace.id,
      elementId: element.id,
      elementName: element.name,
      thumbnailUrl,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <span className="font-semibold text-gray-800">
            Link CAD — <span className="font-normal text-gray-500">{itemName}</span>
          </span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0">
          {/* Left: document list */}
          <div className="w-64 border-r border-gray-200 flex flex-col shrink-0">
            <div className="px-3 py-2 border-b border-gray-100">
              <div className="flex items-center gap-1 border border-gray-300 rounded px-2 py-1">
                <Search size={13} className="text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search documents…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 text-sm outline-none"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {docsLoading ? (
                <div className="flex items-center justify-center py-8 text-gray-400">
                  <Loader2 size={18} className="animate-spin" />
                </div>
              ) : docsError ? (
                <p className="px-3 py-4 text-sm text-red-500">{docsError}</p>
              ) : filteredDocs.length === 0 ? (
                <p className="px-3 py-4 text-sm text-gray-400">No documents found</p>
              ) : (
                filteredDocs.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    className={`w-full text-left px-3 py-2 text-sm border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      selectedDoc?.id === doc.id ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"
                    }`}
                  >
                    {doc.name}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right: element list */}
          <div className="flex-1 overflow-y-auto">
            {!selectedDoc ? (
              <div className="flex items-center justify-center h-full text-sm text-gray-400">
                Select a document
              </div>
            ) : elementsLoading ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                <Loader2 size={18} className="animate-spin" />
              </div>
            ) : elementsError ? (
              <p className="px-4 py-4 text-sm text-red-500">{elementsError}</p>
            ) : elements.length === 0 ? (
              <p className="px-4 py-4 text-sm text-gray-400">No elements found</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {elements.map((el) => {
                  const thumbHref = el.thumbnailInfo?.sizes?.[0]?.href;
                  return (
                    <button
                      key={el.id}
                      onClick={() => handleSelectElement(el)}
                      disabled={saving}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      {thumbHref ? (
                        <img
                          src={`/api/onshape/thumbnail?url=${encodeURIComponent(thumbHref)}`}
                          alt={el.name}
                          className="w-16 h-9 object-contain rounded border border-gray-200 bg-gray-50 shrink-0"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <div className="w-16 h-9 rounded border border-gray-200 bg-gray-100 shrink-0" />
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-800">{el.name}</div>
                        <div className="text-xs text-gray-400">{el.type}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
