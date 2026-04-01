"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import type { Item } from "@/types/item";
import DescriptionEditor from "./DescriptionEditor";

interface Props {
  workspace: Item;
}

export default function WorkspaceHeader({ workspace }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/file/${workspace.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <div
        className="group mb-8 cursor-pointer inline-block"
        onClick={() => setOpen(true)}
      >
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900">{workspace.name}</h1>
          <Pencil
            size={15}
            className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
          />
        </div>
        {workspace.description ? (
          <div className="mt-1 text-gray-500 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: workspace.description }} />
        ) : (
          <p className="mt-1 text-gray-400 italic text-sm opacity-0 group-hover:opacity-100 transition-opacity">
            Add a description…
          </p>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-gray-900">Edit workspace</h2>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Description</label>
              <DescriptionEditor content={description} onChange={setDescription} />
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
