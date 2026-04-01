"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronRight, Home, Folder, Loader2 } from "lucide-react";
import type { Item } from "@/types/item";

interface BrowseItem {
  id: string;
  name: string;
  slug: string;
  type: string;
}

interface Crumb {
  id: string | null; // null = root
  name: string;
}

interface Props {
  item: Item;
  onClose: () => void;
  onMoved: () => void;
}

function slugFromInput(raw: string): string {
  const trimmed = raw.trim();
  // Accept full URLs like http://localhost:3000/workspace/SLUG or just the slug
  const match = trimmed.match(/\/workspace\/([^/?#]+)/);
  return match ? match[1] : trimmed;
}

export default function MoveItemModal({ item, onClose, onMoved }: Props) {
  const [crumbs, setCrumbs] = useState<Crumb[]>([{ id: null, name: "My Workspaces" }]);
  const [browseItems, setBrowseItems] = useState<BrowseItem[]>([]);
  const [canEditCurrent, setCanEditCurrent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);

  const currentCrumb = crumbs[crumbs.length - 1];

  const fetchLevel = useCallback(async (parentId: string | null) => {
    setLoading(true);
    setError(null);
    const url = parentId
      ? `/api/workspace/browse?parentId=${parentId}`
      : `/api/workspace/browse`;
    const res = await fetch(url);
    if (!res.ok) { setError("Failed to load"); setLoading(false); return; }
    const data = await res.json();
    setBrowseItems(data.items ?? []);
    setCanEditCurrent(data.canEdit ?? false);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLevel(null); }, [fetchLevel]);

  function enterFolder(folder: BrowseItem) {
    setCrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
    fetchLevel(folder.id);
  }

  function goToCrumb(index: number) {
    const crumb = crumbs[index];
    setCrumbs((prev) => prev.slice(0, index + 1));
    fetchLevel(crumb.id);
  }

  async function handleUrlNavigate() {
    const slug = slugFromInput(urlInput);
    if (!slug) return;
    setUrlError(null);
    setLoading(true);
    const res = await fetch(`/api/workspace/browse?slug=${encodeURIComponent(slug)}`);
    setLoading(false);
    if (!res.ok) { setUrlError("Workspace not found"); return; }
    const data = await res.json();
    if (data.resolved) {
      setCrumbs([{ id: null, name: "My Workspaces" }, { id: data.resolved.id, name: data.resolved.name }]);
      setBrowseItems(data.items ?? []);
      setCanEditCurrent(data.canEdit ?? false);
      setUrlInput("");
    }
  }

  async function handleMove() {
    if (!currentCrumb.id || !canEditCurrent) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/file/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentId: Number(currentCrumb.id) }),
    });
    setSaving(false);
    if (res.ok) {
      onMoved();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Move failed");
    }
  }

  const canMove = currentCrumb.id !== null && canEditCurrent && !saving;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col"
        style={{ maxHeight: "80vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Move item</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Moving <span className="font-medium text-gray-800">{item.name}</span> — navigate to the destination and click Move here.
          </p>
        </div>

        {/* URL shortcut */}
        <div className="px-6 py-3 border-b border-gray-100 flex gap-2">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => { setUrlInput(e.target.value); setUrlError(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleUrlNavigate(); }}
            placeholder="Paste a workspace URL to navigate directly…"
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleUrlNavigate}
            disabled={!urlInput.trim() || loading}
            className="px-4 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-40 transition"
          >
            Go
          </button>
          {urlError && <span className="self-center text-sm text-red-500">{urlError}</span>}
        </div>

        {/* Breadcrumb */}
        <div className="px-6 py-2 flex items-center gap-1 text-sm border-b border-gray-100 flex-wrap bg-gray-50">
          {crumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight size={13} className="text-gray-300" />}
              <button
                onClick={() => goToCrumb(i)}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-gray-100 transition-colors ${
                  i === crumbs.length - 1
                    ? "text-gray-900 font-medium"
                    : "text-blue-600 hover:text-blue-800"
                }`}
              >
                {i === 0 && <Home size={12} />}
                {crumb.name}
              </button>
            </span>
          ))}
        </div>

        {/* Folder list */}
        <div className="flex-1 overflow-y-auto px-4 py-2 min-h-[160px]">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader2 size={18} className="animate-spin mr-2" />
              Loading…
            </div>
          ) : browseItems.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-10 text-center">No sub-folders here</p>
          ) : (
            <div className="flex flex-col">
              {browseItems.map((bi) => (
                <button
                  key={bi.id}
                  onClick={() => enterFolder(bi)}
                  className="flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 rounded-lg text-left transition-colors group"
                >
                  <span className="flex items-center gap-2.5 text-sm text-gray-800">
                    <Folder size={15} className="text-blue-400 shrink-0" />
                    {bi.name}
                  </span>
                  <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between gap-3">
          <div className="text-sm">
            {error && <span className="text-red-500">{error}</span>}
            {!error && currentCrumb.id === null && (
              <span className="text-gray-400">Navigate into a workspace to select a destination</span>
            )}
            {!error && currentCrumb.id !== null && canEditCurrent && (
              <span className="text-green-700">
                Move into <span className="font-medium">{currentCrumb.name}</span>
              </span>
            )}
            {!error && currentCrumb.id !== null && !canEditCurrent && (
              <span className="text-red-500">You don&apos;t have edit permission here</span>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-100 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleMove}
              disabled={!canMove}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition"
            >
              {saving ? "Moving…" : "Move here"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
