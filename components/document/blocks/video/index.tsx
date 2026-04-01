"use client";

import { memo, useState, useEffect } from "react";
import { Youtube, Play } from "lucide-react";
import type { Block } from "@/types/document";
import type { SelectBlockFn } from "../../documentWrapper";

// ─── URL helpers ──────────────────────────────────────────────────────────────

type VideoSource = "youtube" | "vimeo" | "unknown";

interface EmbedInfo {
  source: VideoSource;
  embedUrl: string | null;
}

function parseVideoUrl(url: string): EmbedInfo {
  if (!url) return { source: "unknown", embedUrl: null };

  // YouTube: youtu.be/ID  or  youtube.com/watch?v=ID  or  youtube.com/embed/ID
  const ytShort   = url.match(/youtu\.be\/([A-Za-z0-9_-]+)/);
  const ytWatch   = url.match(/youtube\.com\/watch\?v=([A-Za-z0-9_-]+)/);
  const ytEmbed   = url.match(/youtube\.com\/embed\/([A-Za-z0-9_-]+)/);
  const ytId      = (ytShort ?? ytWatch ?? ytEmbed)?.[1];
  if (ytId) return { source: "youtube", embedUrl: `https://www.youtube.com/embed/${ytId}` };

  // Vimeo: vimeo.com/ID  or  player.vimeo.com/video/ID
  const vimeoId = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1];
  if (vimeoId) return { source: "vimeo", embedUrl: `https://player.vimeo.com/video/${vimeoId}` };

  return { source: "unknown", embedUrl: null };
}

const SOURCE_LABELS: Record<VideoSource, string> = {
  youtube: "YouTube",
  vimeo:   "Vimeo",
  unknown: "Unknown",
};

const APPROVED_DOMAINS = "YouTube (youtube.com, youtu.be) · Vimeo (vimeo.com)";

// ─── Video Block ──────────────────────────────────────────────────────────────

interface VideoBlockProps {
  block: Block;
  edit?: boolean;
  isSelected?: boolean;
  onSelect?: SelectBlockFn;
  onDefinitionChange?: (blockId: string, newDef: Record<string, unknown>) => void;
}

export default memo(function VideoBlock({
  block,
  edit = false,
  isSelected = false,
  onSelect,
  onDefinitionChange,
}: VideoBlockProps) {
  const initialUrl     = (block.definition.src as string) ?? "";
  const initialCaption = (block.definition.caption as string) ?? "";

  const [displayUrl,     setDisplayUrl]     = useState(initialUrl);
  const [displayCaption, setDisplayCaption] = useState(initialCaption);
  const [editing,        setEditing]        = useState(false);
  const [draftUrl,       setDraftUrl]       = useState(initialUrl);
  const [draftCaption,   setDraftCaption]   = useState(initialCaption);
  const [urlError,       setUrlError]       = useState("");

  // Close edit mode when deselected externally
  useEffect(() => {
    if (!isSelected && editing) {
      setEditing(false);
      setDraftUrl(displayUrl);
      setDraftCaption(displayCaption);
      setUrlError("");
    }
  }, [isSelected]); // eslint-disable-line react-hooks/exhaustive-deps

  function openEdit(e: React.MouseEvent) {
    if (!edit) return;
    e.stopPropagation();
    onSelect?.(block.id);
    setDraftUrl(displayUrl);
    setDraftCaption(displayCaption);
    setUrlError("");
    setEditing(true);
  }

  function save() {
    const { embedUrl, source } = parseVideoUrl(draftUrl.trim());
    if (draftUrl.trim() && !embedUrl) {
      setUrlError("Unsupported URL. Please use a YouTube or Vimeo link.");
      return;
    }
    const src = draftUrl.trim();
    const caption = draftCaption.trim();
    setDisplayUrl(src);
    setDisplayCaption(caption);
    setEditing(false);
    onSelect?.(null);
    onDefinitionChange?.(block.id, { ...block.definition, src, caption });
  }

  function cancel() {
    setEditing(false);
    setDraftUrl(displayUrl);
    setDraftCaption(displayCaption);
    setUrlError("");
  }

  const { source, embedUrl } = parseVideoUrl(displayUrl);

  // ── Edit mode ──────────────────────────────────────────────────────────────
  if (editing) {
    const preview = parseVideoUrl(draftUrl.trim());
    return (
      <div className="rounded-lg ring-2 ring-blue-400 bg-white p-4 my-2 flex flex-col gap-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Edit Video</p>

        {/* URL input */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Video URL</label>
          <input
            autoFocus
            type="url"
            value={draftUrl}
            onChange={(e) => { setDraftUrl(e.target.value); setUrlError(""); }}
            placeholder="https://www.youtube.com/watch?v=..."
            className="text-sm px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:border-blue-400"
          />
          {urlError ? (
            <p className="text-xs text-red-500">{urlError}</p>
          ) : (
            <p className="text-xs text-gray-400">{APPROVED_DOMAINS}</p>
          )}
        </div>

        {/* Source badge */}
        {draftUrl.trim() && (
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              preview.source !== "unknown"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-600"
            }`}>
              {preview.source !== "unknown" ? `✓ ${SOURCE_LABELS[preview.source]}` : "✗ Unsupported"}
            </span>
          </div>
        )}

        {/* Caption */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Caption (optional)</label>
          <input
            type="text"
            value={draftCaption}
            onChange={(e) => setDraftCaption(e.target.value)}
            placeholder="Video caption…"
            className="text-sm px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:border-blue-400"
          />
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
  const videoEl = embedUrl ? (
    <div className="aspect-video rounded-lg overflow-hidden bg-black">
      <iframe
        src={embedUrl}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full"
      />
    </div>
  ) : (
    <div
      className={`aspect-video rounded-lg border border-dashed flex flex-col items-center justify-center gap-2 text-sm ${
        isSelected ? "border-blue-300 bg-blue-50/30" : "border-gray-300 bg-gray-50"
      }`}
    >
      <Play size={28} className="text-gray-300" />
      <span className="text-gray-400">
        {edit ? "Double-click to add a video" : "No video source"}
      </span>
    </div>
  );

  if (!edit) {
    return (
      <figure className="my-2">
        {videoEl}
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
      title={embedUrl ? "Double-click to change video" : "Double-click to add a video"}
    >
      {videoEl}
      {displayCaption && (
        <figcaption className="mt-1 text-center text-xs text-gray-400">{displayCaption}</figcaption>
      )}
      {isSelected && embedUrl && (
        <div className="mt-1 text-center">
          <span className="inline-flex items-center gap-1 text-xs text-gray-400">
            <Youtube size={11} />
            {SOURCE_LABELS[source]} · Double-click to change
          </span>
        </div>
      )}
    </figure>
  );
});
