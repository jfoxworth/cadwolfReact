"use client";

import { useState } from "react";

interface Props {
  partTreeId: string;
  initialDescription: string;
  onClose: () => void;
  onSaved: (description: string) => void;
}

// Plain text, not the rich-text DescriptionEditor Workspace uses — this description also
// becomes part of the structural-similarity embedding (utils/embedPartTree.ts), and raw HTML
// markup would just be noise in that embedded text.
export default function PartTreeDescriptionModal({ partTreeId, initialDescription, onClose, onSaved }: Props) {
  const [value, setValue] = useState(initialDescription);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/file/${partTreeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: value }),
      });
      if (res.ok) onSaved(value);
    } finally {
      setSaving(false);
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-gray-900">Edit description</h2>
        <p className="text-xs text-gray-500 -mt-2">
          Used to describe this part tree at a glance, and to help the AI find it when asked to
          build something similar — a short, plain summary of what this assembly is works best.
        </p>
        <textarea
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={5}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="What is this assembly? What's it for?"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
