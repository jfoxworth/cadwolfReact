"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Network, ExternalLink, RefreshCw } from "lucide-react";

interface DependentVariable {
  sourceVariableName: string;
  localAlias:         string;
}

interface DependentFile {
  fileId:    number;
  fileName:  string;
  variables: DependentVariable[];
}

interface DocumentDependentFilesModalProps {
  fileId:  number;
  onClose: () => void;
}

export default function DocumentDependentFilesModal({
  fileId,
  onClose,
}: DocumentDependentFilesModalProps) {
  const [dependents, setDependents] = useState<DependentFile[]>([]);
  const [loading, setLoading]       = useState(true);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/file/${fileId}/dependents`)
      .then((r) => r.json())
      .then((data: DependentFile[]) => { setDependents(data); setLoading(false); });
  }, [fileId]);

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div
        className="relative bg-white rounded-xl shadow-2xl flex flex-col"
        style={{ width: "min(90vw, 700px)", maxHeight: "80vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Dependent Files</h2>
            <p className="text-sm text-gray-500 mt-1">
              Files that import variables from this document.
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-gray-400">
              <RefreshCw size={16} className="animate-spin mr-2" /> Loading…
            </div>
          ) : dependents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
              <Network size={32} className="opacity-30" />
              <p className="text-sm">No files currently import from this document.</p>
            </div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left sticky top-0">
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">File</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Variable</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Local Alias</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dependents.map((dep) =>
                  dep.variables.map((v, vi) => (
                    <tr key={`${dep.fileId}-${vi}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 align-top">
                        {vi === 0 && (
                          <a
                            href={`/document/${dep.fileId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 text-blue-600 hover:underline font-medium"
                          >
                            {dep.fileName || `Document #${dep.fileId}`}
                            <ExternalLink size={11} className="opacity-60 shrink-0" />
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">{v.sourceVariableName}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{v.localAlias !== v.sourceVariableName ? v.localAlias : "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-gray-200 px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-gray-900 text-white text-sm font-medium hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
