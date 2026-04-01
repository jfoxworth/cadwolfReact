"use client";

import { useState, useEffect } from "react";
import { X, Clock } from "lucide-react";
import type { Block } from "@/types/document";
import { componentToBlock } from "@/utils/transformers";

interface VersionEntry {
  id: number;
  version: number;
  createdBy: number;
  createdByName: string;
  createdAt: string;
}

interface Props {
  fileId: string;
  currentVersion: number;
  onClose: () => void;
  onRestore: (blocks: Block[]) => void;
}

export default function VersionHistoryPanel({ fileId, currentVersion, onClose, onRestore }: Props) {
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewVersion, setPreviewVersion] = useState<number | null>(null);
  const [previewBlocks, setPreviewBlocks] = useState<Block[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/file/${fileId}/versions`)
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json() as { error: string };
          throw new Error(err.error);
        }
        return res.json() as Promise<VersionEntry[]>;
      })
      .then(setVersions)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [fileId]);

  const loadPreview = async (version: number) => {
    setPreviewLoading(true);
    setPreviewVersion(version);
    try {
      const res = await fetch(`/api/file/${fileId}/versions/${version}`);
      if (!res.ok) return;
      const data = await res.json() as { blocks: Parameters<typeof componentToBlock>[0][] };
      setPreviewBlocks(data.blocks.map(componentToBlock));
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end pointer-events-none">
      <div className="pointer-events-auto w-80 bg-white border-l border-gray-200 shadow-xl flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-gray-500" />
            <span className="text-sm font-semibold text-gray-700">Version History</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && <p className="text-sm text-gray-400 italic p-4">Loading…</p>}
          {error && (
            <p className="text-sm text-amber-700 bg-amber-50 m-3 p-3 rounded border border-amber-200">{error}</p>
          )}
          {!loading && !error && versions.length === 0 && (
            <p className="text-sm text-gray-400 italic p-4">No saved versions yet. Check in after editing to create a version.</p>
          )}

          <div className="text-xs text-gray-500 px-4 pt-3 pb-1 font-medium uppercase tracking-wider">
            Current — v{currentVersion}
          </div>

          {versions.map((v) => (
            <button
              key={v.id}
              onClick={() => loadPreview(v.version)}
              className={[
                "w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors",
                previewVersion === v.version ? "bg-blue-50" : "",
              ].join(" ")}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">v{v.version}</span>
                <span className="text-xs text-gray-400">
                  {new Date(v.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-0.5">{v.createdByName}</div>
            </button>
          ))}
        </div>

        {/* Preview pane */}
        {previewVersion !== null && (
          <div className="border-t border-gray-200 p-4">
            {previewLoading ? (
              <p className="text-xs text-gray-400 italic">Loading preview…</p>
            ) : (
              <>
                <p className="text-xs text-gray-500 mb-2">
                  v{previewVersion} — {previewBlocks.length} blocks
                </p>
                <div className="text-xs text-gray-600 space-y-1 max-h-32 overflow-y-auto mb-3">
                  {previewBlocks.slice(0, 8).map((b) => (
                    <div key={b.id} className="truncate">
                      <span className="text-gray-400">{b.type}</span>{" "}
                      {b.type === "EQUATION" ? (b.definition.raw as string) ?? "" : ""}
                      {b.type === "HEADER" ? (b.definition.text as string) ?? "" : ""}
                    </div>
                  ))}
                  {previewBlocks.length > 8 && (
                    <div className="text-gray-400">…and {previewBlocks.length - 8} more</div>
                  )}
                </div>
                <button
                  onClick={() => onRestore(previewBlocks)}
                  className="w-full rounded bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700"
                >
                  Restore v{previewVersion}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
