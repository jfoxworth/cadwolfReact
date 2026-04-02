"use client";

import { memo, useState, useEffect, useCallback } from "react";
import { ImageIcon, Link, FolderOpen, Folder, ChevronRight, ArrowUp, RefreshCw, Upload, Lock } from "lucide-react";
import type { Block } from "@/types/document";
import type { SelectBlockFn } from "../../documentWrapper";
import type { ImageBrowseItem } from "@/app/api/image-browse/route";

type SourceTab = "link" | "workspace" | "upload";

interface BreadcrumbEntry { id: number | null; name: string }

interface ImageBlockProps {
  block:              Block;
  edit?:              boolean;
  isSelected?:        boolean;
  onSelect?:          SelectBlockFn;
  onDefinitionChange?: (blockId: string, newDef: Record<string, unknown>) => void;
  canUpload?:         boolean;
}

// ── Workspace image browser ───────────────────────────────────────────────────

function WorkspaceBrowser({ onSelectUrl }: { onSelectUrl: (url: string) => void }) {
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbEntry[]>([{ id: null, name: "Workspaces" }]);
  const [items,       setItems]       = useState<ImageBrowseItem[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [selected,    setSelected]    = useState<ImageBrowseItem | null>(null);

  const loadItems = useCallback(async (parentId: number | null) => {
    setLoading(true);
    setSelected(null);
    const res = await fetch(`/api/image-browse?parentId=${parentId ?? "null"}`);
    setItems(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { loadItems(null); }, [loadItems]);

  function navigateInto(item: ImageBrowseItem) {
    setBreadcrumbs((prev) => [...prev, { id: item.id, name: item.name }]);
    loadItems(item.id);
  }

  function navigateTo(idx: number) {
    const crumb = breadcrumbs[idx];
    setBreadcrumbs((prev) => prev.slice(0, idx + 1));
    loadItems(crumb.id);
  }

  function navigateUp() {
    if (breadcrumbs.length < 2) return;
    navigateTo(breadcrumbs.length - 2);
  }

  const folders = items.filter((i) => i.fileTypeId !== "Image");
  const images  = items.filter((i) => i.fileTypeId === "Image");

  return (
    <div className="flex flex-col gap-2">
      {/* Breadcrumb + up arrow */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500 flex-wrap">
        {breadcrumbs.length > 1 && (
          <button
            type="button"
            onClick={navigateUp}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
            title="Go up"
          >
            <ArrowUp size={13} />
          </button>
        )}
        {breadcrumbs.map((crumb, idx) => (
          <span key={idx} className="flex items-center gap-1">
            {idx > 0 && <ChevronRight size={11} className="text-gray-300" />}
            <button
              type="button"
              onClick={() => navigateTo(idx)}
              className={`hover:text-gray-800 transition-colors ${
                idx === breadcrumbs.length - 1 ? "text-gray-800 font-medium" : "hover:underline"
              }`}
            >
              {crumb.name}
            </button>
          </span>
        ))}
      </div>

      {/* Item list */}
      <div className="rounded-md border border-gray-200 overflow-hidden bg-white" style={{ maxHeight: 220, overflowY: "auto" }}>
        {loading ? (
          <div className="flex items-center justify-center h-20 text-gray-400">
            <RefreshCw size={15} className="animate-spin mr-2" /> Loading…
          </div>
        ) : folders.length === 0 && images.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No folders or images here.</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {folders.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => navigateInto(f)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-gray-50 text-gray-700"
                >
                  <Folder size={14} className="shrink-0 text-amber-400" />
                  <span className="flex-1 truncate">{f.name}</span>
                  <ChevronRight size={12} className="text-gray-300 shrink-0" />
                </button>
              </li>
            ))}
            {images.map((img) => (
              <li key={img.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(img);
                    if (img.imageUrl) onSelectUrl(img.imageUrl);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${
                    selected?.id === img.id
                      ? "bg-blue-50 text-blue-700"
                      : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  {img.imageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={img.imageUrl} alt="" className="h-8 w-10 rounded object-cover shrink-0 bg-gray-100" />
                  ) : (
                    <ImageIcon size={14} className="shrink-0 text-gray-300" />
                  )}
                  <span className="flex-1 truncate">{img.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected?.imageUrl && (
        <p className="text-xs text-gray-400 truncate">Selected: {selected.name}</p>
      )}
    </div>
  );
}

// ── Main block ────────────────────────────────────────────────────────────────

export default memo(function ImageBlock({
  block,
  edit = false,
  isSelected = false,
  onSelect,
  onDefinitionChange,
  canUpload = false,
}: ImageBlockProps) {
  const initialSrc     = (block.definition.src     as string) ?? "";
  const initialAlt     = (block.definition.alt     as string) ?? (block.name ?? "");
  const initialCaption = (block.definition.caption as string) ?? "";

  const [displaySrc,     setDisplaySrc]     = useState(initialSrc);
  const [displayAlt,     setDisplayAlt]     = useState(initialAlt);
  const [displayCaption, setDisplayCaption] = useState(initialCaption);
  const [editing,        setEditing]        = useState(false);
  const [activeTab,      setActiveTab]      = useState<SourceTab>("link");
  const [draftSrc,       setDraftSrc]       = useState(initialSrc);
  const [draftAlt,       setDraftAlt]       = useState(initialAlt);
  const [draftCaption,   setDraftCaption]   = useState(initialCaption);
  const [uploading,      setUploading]      = useState(false);
  const [uploadError,    setUploadError]    = useState<string | null>(null);

  // Close edit mode when deselected externally
  useEffect(() => {
    if (!isSelected && editing) {
      setEditing(false);
      resetDraft();
    }
  }, [isSelected]); // eslint-disable-line react-hooks/exhaustive-deps

  function resetDraft() {
    setDraftSrc(displaySrc);
    setDraftAlt(displayAlt);
    setDraftCaption(displayCaption);
  }

  function openEdit(e: React.MouseEvent) {
    if (!edit) return;
    e.stopPropagation();
    onSelect?.(block.id);
    resetDraft();
    setEditing(true);
  }

  function save() {
    const src     = draftSrc.trim();
    const alt     = draftAlt.trim();
    const caption = draftCaption.trim();
    setDisplaySrc(src);
    setDisplayAlt(alt);
    setDisplayCaption(caption);
    setEditing(false);
    onSelect?.(null);
    onDefinitionChange?.(block.id, { ...block.definition, src, alt, caption });
  }

  function cancel() {
    setEditing(false);
    resetDraft();
  }

  // ── Edit mode ──────────────────────────────────────────────────────────────
  if (editing) {
    return (
      <div className="rounded-lg ring-2 ring-blue-400 bg-white p-4 my-2 flex flex-col gap-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Edit Image</p>

        {/* Source tabs */}
        <div className="flex rounded-md border border-gray-200 overflow-hidden text-sm">
          <button
            type="button"
            onClick={() => setActiveTab("link")}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 transition-colors ${
              activeTab === "link"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Link size={13} />
            Link / URL
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("workspace")}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 border-l border-gray-200 transition-colors ${
              activeTab === "workspace"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <FolderOpen size={13} />
            Workspace
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("upload"); setUploadError(null); }}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 border-l border-gray-200 transition-colors ${
              activeTab === "upload"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {canUpload ? <Upload size={13} /> : <Lock size={13} />}
            Upload
            {!canUpload && <span className="ml-0.5 text-[9px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700 rounded px-1 py-0.5">Pro</span>}
          </button>
        </div>

        {/* Link tab */}
        {activeTab === "link" && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Image URL</label>
              <input
                autoFocus
                type="url"
                value={draftSrc}
                onChange={(e) => setDraftSrc(e.target.value)}
                placeholder="https://example.com/image.png"
                className="text-sm px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:border-blue-400"
              />
            </div>

            {/* Preview */}
            {draftSrc.trim() && (
              <div className="rounded-md border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center max-h-48">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={draftSrc.trim()}
                  alt="preview"
                  className="max-h-48 max-w-full object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            )}
          </div>
        )}

        {/* Workspace tab */}
        {activeTab === "workspace" && (
          <WorkspaceBrowser onSelectUrl={(url) => setDraftSrc(url)} />
        )}

        {/* Upload tab */}
        {activeTab === "upload" && !canUpload && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Lock size={26} className="text-gray-300" />
            <p className="text-sm text-gray-500">Image uploads require a <strong>Pro</strong> or <strong>Business</strong> subscription.</p>
            <a href="/accounts" className="text-sm font-medium text-blue-600 hover:underline">View plans →</a>
          </div>
        )}
        {activeTab === "upload" && canUpload && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-gray-500">Upload an image from your computer (JPEG, PNG, GIF, WebP · max 10 MB).</p>
            <label className={`flex items-center justify-center gap-2 px-4 py-3 rounded-md border-2 border-dashed cursor-pointer transition-colors ${
              uploading ? "border-gray-200 bg-gray-50 text-gray-400" : "border-blue-300 hover:border-blue-400 hover:bg-blue-50 text-blue-600"
            }`}>
              {uploading ? (
                <><RefreshCw size={15} className="animate-spin" /> Uploading…</>
              ) : (
                <><Upload size={15} /> Choose a file</>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                disabled={uploading}
                onChange={async (e) => {
                  const picked = e.target.files?.[0];
                  if (!picked) return;
                  setUploading(true);
                  setUploadError(null);
                  try {
                    const fd = new FormData();
                    fd.append("file", picked);
                    const res = await fetch("/api/upload", { method: "POST", body: fd });
                    const json = await res.json();
                    if (!res.ok) {
                      setUploadError(json.error ?? "Upload failed.");
                    } else {
                      setDraftSrc(json.url);
                      setActiveTab("link");
                    }
                  } catch {
                    setUploadError("Upload failed. Please try again.");
                  } finally {
                    setUploading(false);
                  }
                }}
              />
            </label>
            {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
          </div>
        )}

        {/* Alt text & caption */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Alt text</label>
            <input
              type="text"
              value={draftAlt}
              onChange={(e) => setDraftAlt(e.target.value)}
              placeholder="Describe the image…"
              className="text-sm px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:border-blue-400"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Caption (optional)</label>
            <input
              type="text"
              value={draftCaption}
              onChange={(e) => setDraftCaption(e.target.value)}
              placeholder="Image caption…"
              className="text-sm px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:border-blue-400"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100">
          <button
            type="button"
            onClick={cancel}
            className="px-3 py-1.5 rounded-md border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  // ── View ───────────────────────────────────────────────────────────────────
  const imgEl = displaySrc ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={displaySrc}
      alt={displayAlt}
      className="rounded-lg max-w-full"
    />
  ) : (
    <div
      className={`rounded-lg border border-dashed flex flex-col items-center justify-center gap-2 py-10 text-sm ${
        isSelected ? "border-blue-300 bg-blue-50/30" : "border-gray-300 bg-gray-50"
      }`}
    >
      <ImageIcon size={28} className="text-gray-300" />
      <span className="text-gray-400">
        {edit ? "Double-click to add an image" : "No image source"}
      </span>
    </div>
  );

  if (!edit) {
    return (
      <figure className="my-2">
        {imgEl}
        {displayCaption && (
          <figcaption className="mt-1 text-center text-xs text-gray-400">{displayCaption}</figcaption>
        )}
      </figure>
    );
  }

  return (
    <figure
      onClick={(e) => { e.stopPropagation(); onSelect?.(isSelected ? null : block.id); }}
      onDoubleClick={openEdit}
      className={`my-2 rounded-lg transition-all cursor-pointer ${
        isSelected ? "ring-2 ring-blue-200" : "hover:ring-2 hover:ring-gray-200"
      }`}
      title={displaySrc ? "Double-click to change image" : "Double-click to add an image"}
    >
      {imgEl}
      {displayCaption && (
        <figcaption className="mt-1 text-center text-xs text-gray-400">{displayCaption}</figcaption>
      )}
    </figure>
  );
});
