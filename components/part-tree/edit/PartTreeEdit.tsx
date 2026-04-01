"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, AlignLeft, Lock, Trash2, FolderPlus, FilePlus } from "lucide-react";
import PermissionsModal from "@/components/workspace/edit/PermissionsModal";
import type { Item } from "@/types/item";

type ModalMode = "title" | "description" | "delete" | null;

interface ModalState {
  mode: ModalMode;
  item: Item;
  value: string;
}

interface Props {
  root: Item;
  childrenMap: Map<string, Item[]>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  canAdmin: boolean;
  userId: number;
}

export default function PartTreeEdit({ root, childrenMap, selectedId, onSelect, canAdmin, userId }: Props) {
  const router = useRouter();
  const [modal, setModal] = useState<ModalState | null>(null);
  const [permissionsItem, setPermissionsItem] = useState<Item | null>(null);
  const [saving, setSaving] = useState(false);

  // Find the selected item from the map
  const allItems = [...childrenMap.values()].flat();
  const selectedItem = selectedId
    ? (selectedId === root.id ? root : allItems.find((i) => i.id === selectedId) ?? null)
    : null;

  function openModal(mode: "title" | "description" | "delete") {
    if (!selectedItem) return;
    setModal({
      mode,
      item: selectedItem,
      value: mode === "title" ? selectedItem.name : (selectedItem.description ?? ""),
    });
  }

  async function handleSave() {
    if (!modal) return;
    setSaving(true);
    const body = modal.mode === "title" ? { name: modal.value } : { description: modal.value };
    await fetch(`/api/file/${modal.item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    setModal(null);
    router.refresh();
  }

  async function handleDelete() {
    if (!modal) return;
    setSaving(true);
    await fetch(`/api/file/${modal.item.id}`, { method: "DELETE" });
    setSaving(false);
    setModal(null);
    onSelect(null);
    router.refresh();
  }

  async function handleAddFolder() {
    if (!selectedId) return;
    await fetch("/api/file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileTypeId: "Folder", name: "New Folder", parentId: Number(selectedId), userId }),
    });
    router.refresh();
  }

  async function handleAddDocument() {
    if (!selectedId) return;
    await fetch("/api/file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileTypeId: "Document", name: "New Document", parentId: Number(selectedId), userId }),
    });
    router.refresh();
  }

  const canAddChildren = selectedItem && selectedItem.type !== "DOCUMENT";

  return (
    <>
      {/* Horizontal edit toolbar */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-200 bg-gray-50 flex-wrap">
        <span className="text-xs text-gray-400 mr-2 truncate max-w-[160px]">
          {selectedItem ? selectedItem.name : "No item selected"}
        </span>

        <button
          disabled={!selectedItem}
          onClick={() => openModal("title")}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs text-gray-600 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          <Pencil size={13} /> Rename
        </button>

        <button
          disabled={!selectedItem}
          onClick={() => openModal("description")}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs text-gray-600 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          <AlignLeft size={13} /> Description
        </button>

        {canAdmin && (
          <button
            disabled={!selectedItem}
            onClick={() => selectedItem && setPermissionsItem(selectedItem)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs text-gray-600 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <Lock size={13} /> Permissions
          </button>
        )}

        <button
          disabled={!selectedItem}
          onClick={() => openModal("delete")}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          <Trash2 size={13} /> Delete
        </button>

        {canAddChildren && (
          <>
            <div className="w-px h-4 bg-gray-200 mx-1" />
            <button
              onClick={handleAddFolder}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs text-gray-600 hover:bg-gray-200 transition"
            >
              <FolderPlus size={13} /> Add Folder
            </button>
            <button
              onClick={handleAddDocument}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs text-gray-600 hover:bg-gray-200 transition"
            >
              <FilePlus size={13} /> Add Document
            </button>
          </>
        )}
      </div>

      {/* Permissions modal */}
      {permissionsItem && (
        <PermissionsModal
          itemId={permissionsItem.id}
          itemName={permissionsItem.name}
          onClose={() => setPermissionsItem(null)}
        />
      )}

      {/* Edit / delete modal */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            {modal.mode === "delete" ? (
              <>
                <h2 className="text-lg font-semibold text-gray-900">Delete item?</h2>
                <p className="text-sm text-gray-600">
                  Are you sure you want to delete{" "}
                  <span className="font-medium text-gray-900">{modal.item.name}</span>? This cannot be undone.
                </p>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setModal(null)} className="px-4 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-100 transition">
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={saving}
                    className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition"
                  >
                    {saving ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-gray-900">
                  {modal.mode === "title" ? "Edit title" : "Edit description"}
                </h2>
                <p className="text-sm text-gray-500 -mt-2">{modal.item.name}</p>
                {modal.mode === "title" ? (
                  <input
                    type="text"
                    value={modal.value}
                    onChange={(e) => setModal({ ...modal, value: e.target.value })}
                    className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                ) : (
                  <textarea
                    value={modal.value}
                    onChange={(e) => setModal({ ...modal, value: e.target.value })}
                    rows={5}
                    placeholder="Add a description…"
                    className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    autoFocus
                  />
                )}
                <div className="flex justify-end gap-2">
                  <button onClick={() => setModal(null)} className="px-4 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-100 transition">
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || (modal.mode === "title" && !modal.value.trim())}
                    className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
