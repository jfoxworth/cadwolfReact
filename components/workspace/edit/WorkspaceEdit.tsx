"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil,
  AlignLeft,
  Lock,
  ArrowRightLeft,
  Copy,
  Trash2,
  FolderPlus,
  FilePlus,
  Database,
  GitBranch,
  ImagePlus,
  ChevronUp,
  ChevronDown,
  Upload,
  RefreshCw,
} from "lucide-react";
import ItemIcon from "../ItemIcon";
// import EditPanel from "./EditPanel"; // replaced by inline slide-out menu
import PermissionsModal from "./PermissionsModal";
import MoveItemModal from "./MoveItemModal";
import DescriptionEditor from "./DescriptionEditor";
import type { Item, ItemType } from "@/types/item";
import type { CadConn } from "../workspaceWrapper";
import { useSideMenuAdd, type AddItem } from "@/context/SideMenuAddContext";

const TYPE_ROUTE: Record<ItemType, string> = {
  WORKSPACE: "workspace",
  FOLDER: "workspace",
  DOCUMENT: "document",
  DATASET: "dataset",
  PART_TREE: "part-tree",
  IMAGE: "workspace",
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

type ModalMode = "title" | "description" | "delete" | null;

interface ModalState {
  mode: ModalMode;
  item: Item;
  value: string;
}

const editActions: { label: string; icon: React.ElementType; destructive?: boolean }[] = [
  { label: "Edit Title",       icon: Pencil },
  { label: "Edit Description", icon: AlignLeft },
  { label: "Edit Permissions", icon: Lock },
  { label: "Move Item",        icon: ArrowRightLeft },
  { label: "Copy Item",        icon: Copy },
  { label: "Delete Item",      icon: Trash2, destructive: true },
];

function randomSuffix() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

const LABEL_TO_FILE_TYPE: Record<string, string> = {
  Workspace: "Workspace",
  Document:  "Document",
  Dataset:   "Dataset",
  "Part Tree": "PartTree",
};

const LABEL_TO_DISPLAY: Record<string, string> = {
  Workspace:   "Workspace",
  Document:    "Document",
  Dataset:     "Dataset",
  "Part Tree": "Part Tree",
};

export default function WorkspaceEdit({ items: initialItems, canAdmin, workspaceId, userId, cadConns, canUpload = false }: { items: Item[]; canAdmin: boolean; workspaceId: string; userId: number; cadConns: Map<string, CadConn>; canUpload?: boolean }) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>(initialItems);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [permissionsItem, setPermissionsItem] = useState<Item | null>(null);
  const [moveItem, setMoveItem] = useState<Item | null>(null);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [pendingScrollId, setPendingScrollId] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingScrollId) return;
    const idx = items.findIndex((it) => it.id === pendingScrollId);
    if (idx === -1) return;
    const el = rowRefs.current[idx];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    setSelectedItem(items[idx]);
    setPendingScrollId(null);
  }, [pendingScrollId, items]);

  const { setAddConfig } = useSideMenuAdd();

  const createItem = useCallback(async (label: string) => {
    if (label === "Image") {
      setImageModalOpen(true);
      return;
    }
    const fileTypeId = LABEL_TO_FILE_TYPE[label];
    if (!fileTypeId) return;
    const name = `New ${LABEL_TO_DISPLAY[label]} ${randomSuffix()}`;
    const res = await fetch("/api/file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileTypeId, name, parentId: parseInt(workspaceId, 10), userId }),
    });
    if (res.ok) {
      const newItem: Item = await res.json();
      setItems((prev) => [...prev, newItem]);
      setPendingScrollId(newItem.id);
    }
  }, [workspaceId, userId]);

  const createItemRef = useRef(createItem);
  useEffect(() => { createItemRef.current = createItem; }, [createItem]);

  useEffect(() => {
    const items: AddItem[] = [
      { label: "Workspace", icon: FolderPlus },
      { label: "Document",  icon: FilePlus   },
      { label: "Dataset",   icon: Database   },
      { label: "Part Tree", icon: GitBranch  },
      { label: "Image",     icon: ImagePlus  },
    ];
    setAddConfig({ items, onAdd: (label) => createItemRef.current(label) });
    return () => setAddConfig(null);
  }, [setAddConfig]);

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
    const body =
      modal.mode === "title"
        ? { name: modal.value }
        : { description: modal.value };
    await fetch(`/api/file/${modal.item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (modal.mode === "title") {
      setItems((prev) =>
        prev.map((it) => it.id === modal.item.id ? { ...it, name: modal.value } : it)
      );
    }
    setModal(null);
    router.refresh();
  }

  async function handleDelete() {
    if (!modal) return;
    setSaving(true);
    const res = await fetch(`/api/file/${modal.item.id}`, { method: "DELETE" });
    setSaving(false);
    if (res.ok) {
      setItems((prev) => prev.filter((it) => it.id !== modal.item.id));
    }
    setModal(null);
    setSelectedItem(null);
  }

  async function handleCopy() {
    if (!selectedItem) return;
    setCopying(true);
    const res = await fetch(`/api/file/${selectedItem.id}/copy`, { method: "POST" });
    setCopying(false);
    if (res.ok) {
      const newItem: Item = await res.json();
      setItems((prev) => [...prev, newItem]);
      setPendingScrollId(newItem.id);
      setSelectedItem(null);
    }
  }

  async function handleReorder(item: Item, direction: "up" | "down") {
    const res = await fetch(`/api/file/${item.id}/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    if (!res.ok) return;
    // Swap positions locally to avoid a full reload
    setItems((prev) => {
      const next = [...prev];
      const idx = next.findIndex((it) => it.id === item.id);
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= next.length) return prev;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  }

  function handleAction(label: string) {
    if (label === "Edit Title") openModal("title");
    else if (label === "Edit Description") openModal("description");
    else if (label === "Delete Item") openModal("delete");
    else if (label === "Edit Permissions" && selectedItem) setPermissionsItem(selectedItem);
    else if (label === "Move Item" && selectedItem) setMoveItem(selectedItem);
    else if (label === "Copy Item") handleCopy();
  }

  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingItemIdRef = useRef<string | null>(null);

  const handleRowClick = useCallback((item: Item) => {
    if (clickTimerRef.current !== null && pendingItemIdRef.current === item.id) {
      // Second click on same item within threshold → navigate
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      pendingItemIdRef.current = null;
      router.push(`/${TYPE_ROUTE[item.type]}/${item.slug}`);
    } else {
      // First click → toggle selection, start timer
      if (clickTimerRef.current !== null) clearTimeout(clickTimerRef.current);
      setSelectedItem((prev) => prev?.id === item.id ? null : item);
      pendingItemIdRef.current = item.id;
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
        pendingItemIdRef.current = null;
      }, 300);
    }
  }, [router]);

  const selectedIndex = selectedItem ? items.findIndex((it) => it.id === selectedItem.id) : -1;
  const menuTop = selectedIndex >= 0 ? (rowRefs.current[selectedIndex]?.offsetTop ?? 0) : 0;

  return (
    <>
      <div className="flex gap-4 items-start">
        {/* Left action panel — commented out, replaced by slide-out row menu */}
        {/*
        <div className="sticky top-4">
          <EditPanel
            selectedItem={selectedItem}
            canAdmin={canAdmin}
            onEditTitle={() => openModal("title")}
            onEditDescription={() => openModal("description")}
            onDeleteItem={() => openModal("delete")}
            onEditPermissions={() => selectedItem && setPermissionsItem(selectedItem)}
          />
        </div>
        */}

        {/* Item list — relative so slide-out menu can position against it */}
        <div className="flex-1 relative z-[1]">

          {/* Slide-out edit menu */}
          <div
            style={{
              position: "absolute",
              left: "calc(100% + 8px)",
              top: menuTop,
              opacity: selectedItem ? 1 : 0,
              transform: selectedItem ? "translateX(0)" : "translateX(-8px)",
              pointerEvents: selectedItem ? "auto" : "none",
              transition: "opacity 0.18s ease, transform 0.18s ease, top 0.18s ease",
              zIndex: 10,
            }}
          >
            <div className="w-44 rounded-lg border border-gray-200 bg-white shadow-md py-1">
              {editActions.map(({ label, icon: Icon, destructive }) => {
                if (label === "Copy Item" && selectedItem?.type !== "DOCUMENT") return null;
                const isDisabled =
                  (label === "Edit Permissions" && !canAdmin) ||
                  (label === "Copy Item" && copying);
                return (
                  <button
                    key={label}
                    disabled={isDisabled}
                    onClick={() => handleAction(label)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                      destructive
                        ? "text-red-500 hover:bg-red-50 hover:text-red-600"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <Icon size={14} className="shrink-0" />
                    {label === "Copy Item" && copying ? "Copying…" : label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* List */}
          <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
            <div className="grid grid-cols-[32px_1fr_160px_160px] bg-white border-b border-gray-200 px-4 py-2 text-sm font-semibold text-gray-500 uppercase tracking-wide">
              <span />
              <span>Name</span>
              <span>Date Created</span>
              <span>Last Modified</span>
            </div>

            {items.map((item, i) => {
              const isSelected = selectedItem?.id === item.id;
              return (
                <div
                  key={item.id}
                  ref={(el) => { rowRefs.current[i] = el; }}
                  onClick={() => handleRowClick(item)}
                  className={`grid grid-cols-[32px_1fr_160px_160px] items-center px-4 py-3 cursor-pointer select-none transition-colors ${
                    i < items.length - 1 ? "border-b border-gray-100" : ""
                  } ${isSelected ? "bg-blue-50" : "hover:bg-gray-50"}`}
                >
                  {/* Order controls */}
                  <div className="flex flex-col items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      disabled={i === 0}
                      onClick={() => handleReorder(item, "up")}
                      title="Move up"
                      className="p-0.5 rounded text-gray-300 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-0 disabled:pointer-events-none transition-colors"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      disabled={i === items.length - 1}
                      onClick={() => handleReorder(item, "down")}
                      title="Move down"
                      className="p-0.5 rounded text-gray-300 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-0 disabled:pointer-events-none transition-colors"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>

                  <div className={`flex items-center gap-3 text-base font-medium transition-colors ${
                    isSelected ? "text-blue-700" : "text-gray-800"
                  }`}>
                    <span className="shrink-0">
                      <ItemIcon type={item.type} />
                    </span>
                    {item.type === "IMAGE" && item.fileImage && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.fileImage} alt="" className="h-10 w-auto rounded object-contain opacity-90 shrink-0" />
                    )}
                    <span>{item.name}</span>
                    {item.lockedBy && item.lockedAt &&
                      Date.now() - new Date(item.lockedAt).getTime() < 24 * 60 * 60 * 1000 && (
                      <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" aria-label="Checked out" />
                    )}
                    {item.type === "DOCUMENT" && cadConns.get(item.id)?.href && (
                      <a
                        href={cadConns.get(item.id)!.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title="Open in Onshape"
                        className="ml-1 shrink-0"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="https://cadwolf.s3.amazonaws.com/stock/onshapeIcon.png"
                          alt="Onshape"
                          className="h-5 w-5 rounded-full object-contain"
                        />
                      </a>
                    )}
                  </div>
                  <span className="text-base text-gray-400">{formatDate(item.createdAt)}</span>
                  <span className="text-base text-gray-400">{formatDate(item.updatedAt)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Image modal */}
      {imageModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => { setImageModalOpen(false); setImageUploadError(null); }}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-gray-900">Add Image</h2>

            {!canUpload ? (
              <>
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <Lock size={26} className="text-gray-300" />
                  <p className="text-sm text-gray-500">Image uploads require a <strong>Pro</strong> or <strong>Business</strong> subscription.</p>
                  <a href="/accounts" className="text-sm font-medium text-blue-600 hover:underline">View plans →</a>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => setImageModalOpen(false)}
                    className="px-4 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-100 transition"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-500 -mt-2">Upload an image from your computer (JPEG, PNG, GIF, WebP · max 10 MB).</p>
                <label className={`flex items-center justify-center gap-2 px-4 py-5 rounded-md border-2 border-dashed cursor-pointer transition-colors ${
                  imageUploading ? "border-gray-200 bg-gray-50 text-gray-400" : "border-blue-300 hover:border-blue-400 hover:bg-blue-50 text-blue-600"
                }`}>
                  {imageUploading ? (
                    <><RefreshCw size={16} className="animate-spin" /> Uploading…</>
                  ) : (
                    <><Upload size={16} /> Choose a file</>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    disabled={imageUploading}
                    onChange={async (e) => {
                      const picked = e.target.files?.[0];
                      if (!picked) return;
                      setImageUploading(true);
                      setImageUploadError(null);
                      try {
                        const fd = new FormData();
                        fd.append("file", picked);
                        fd.append("parentId", workspaceId);
                        const res = await fetch("/api/upload", { method: "POST", body: fd });
                        const json = await res.json();
                        if (!res.ok) {
                          setImageUploadError(json.error ?? "Upload failed.");
                        } else if (json.item) {
                          setItems((prev) => [...prev, json.item]);
                          setPendingScrollId(json.item.id);
                          setImageModalOpen(false);
                          setImageUploadError(null);
                        }
                      } catch {
                        setImageUploadError("Upload failed. Please try again.");
                      } finally {
                        setImageUploading(false);
                      }
                    }}
                  />
                </label>
                {imageUploadError && <p className="text-sm text-red-500">{imageUploadError}</p>}
                <div className="flex justify-end">
                  <button
                    onClick={() => { setImageModalOpen(false); setImageUploadError(null); }}
                    className="px-4 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-100 transition"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Move item modal */}
      {moveItem && (
        <MoveItemModal
          item={moveItem}
          onClose={() => setMoveItem(null)}
          onMoved={() => {
            setItems((prev) => prev.filter((it) => it.id !== moveItem.id));
            setSelectedItem(null);
            setMoveItem(null);
            router.refresh();
          }}
        />
      )}

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
                  <span className="font-medium text-gray-900">{modal.item.name}</span>?
                  This cannot be undone.
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setModal(null)}
                    className="px-4 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-100 transition"
                  >
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
                  <DescriptionEditor
                    content={modal.value}
                    onChange={(html) => setModal({ ...modal, value: html })}
                  />
                )}

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setModal(null)}
                    className="px-4 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-100 transition"
                  >
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
