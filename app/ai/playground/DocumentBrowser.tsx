"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, Folder, ChevronRight, ArrowUp, RefreshCw } from "lucide-react";
import type { PlaygroundBrowseItem as BrowseItem } from "@/app/api/playground/browse/route";

// Walks your workspaces and folders to a document. Built on the image block's workspace browser
// (components/document/blocks/image/index.tsx). It uses /api/playground/browse, which, unlike
// /api/file-browse, lists workspaces nested inside workspaces.

interface Crumb { id: number | null; name: string }

export function DocumentBrowser({
  selectedId, onSelect,
}: {
  selectedId: number | null;
  onSelect: (doc: { id: number; name: string }) => void;
}) {
  const [crumbs, setCrumbs] = useState<Crumb[]>([{ id: null, name: "Workspaces" }]);
  const [items, setItems] = useState<BrowseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async (parentId: number | null) => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch(`/api/playground/browse?parentId=${parentId ?? "null"}`);
      if (!res.ok) throw new Error();
      setItems(await res.json());
    } catch {
      setItems([]);
      setFailed(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(null); }, [load]);

  function into(item: BrowseItem) {
    setCrumbs((prev) => [...prev, { id: item.id, name: item.name }]);
    load(item.id);
  }
  function to(idx: number) {
    const crumb = crumbs[idx];
    setCrumbs((prev) => prev.slice(0, idx + 1));
    load(crumb.id);
  }

  const folders = items.filter((i) => i.fileTypeId === "Workspace" || i.fileTypeId === "Folder");
  const documents = items.filter((i) => i.fileTypeId === "Document");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
        {crumbs.length > 1 && (
          <button type="button" onClick={() => to(crumbs.length - 2)} title="Go up"
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <ArrowUp size={13} />
          </button>
        )}
        {crumbs.map((crumb, idx) => (
          <span key={idx} className="flex items-center gap-1">
            {idx > 0 && <ChevronRight size={11} className="text-gray-300" />}
            <button type="button" onClick={() => to(idx)}
              className={idx === crumbs.length - 1 ? "font-medium text-gray-800" : "hover:text-gray-800 hover:underline"}>
              {crumb.name}
            </button>
          </span>
        ))}
      </div>

      <div className="overflow-hidden rounded-md border border-gray-200 bg-white" style={{ maxHeight: 220, overflowY: "auto" }}>
        {loading ? (
          <div className="flex h-20 items-center justify-center text-gray-400">
            <RefreshCw size={15} className="mr-2 animate-spin" /> Loading…
          </div>
        ) : failed ? (
          <p className="py-8 text-center text-sm text-red-700">Couldn&apos;t load this folder.</p>
        ) : folders.length === 0 && documents.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">No folders or documents here.</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {folders.map((f) => (
              <li key={f.id}>
                <button type="button" onClick={() => into(f)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
                  <Folder size={14} className="shrink-0 text-amber-400" />
                  <span className="flex-1 truncate">{f.name}</span>
                  <ChevronRight size={12} className="shrink-0 text-gray-300" />
                </button>
              </li>
            ))}
            {documents.map((d) => (
              <li key={d.id}>
                <button type="button" onClick={() => onSelect({ id: d.id, name: d.name })}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                    selectedId === d.id ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
                  }`}>
                  <FileText size={14} className="shrink-0 text-gray-400" />
                  <span className="flex-1 truncate">{d.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
