"use client";

import { useState, useRef, useEffect } from "react";
import {
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import ItemIcon from "@/components/workspace/ItemIcon";
import type { Item } from "@/types/item";

interface EqValue {
  value: number | null;
  unit: string | null;
}

interface OnshapeConnInfo {
  documentId: string;
  workspaceId: string;
  elementId?: string;
  elementName?: string;
  thumbnailUrl?: string;
}

interface Props {
  root: Item;
  childrenMap: Map<string, Item[]>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  displayValues: Map<string, EqValue>;
  cadDisplayValues: Map<string, EqValue>;
  valueToSumLabel: string;
  anyStale: boolean;
  onshapeConns: Map<string, OnshapeConnInfo>;
  onQuantityChange: (itemId: string, quantity: number | null) => void;
  onAddItem: (parentId: string, fileTypeId: string) => Promise<void>;
  onRenameItem: (itemId: string, name: string) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  onLinkCad: (itemId: string) => void;
  canEdit: boolean;
  resolvingId?: string | null;
  onResolve?: (item: Item) => void;
  refreshingCadId?: string | null;
  onRefreshCad?: (item: Item) => void;
}

interface TreeNodeProps {
  item: Item;
  childrenMap: Map<string, Item[]>;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
  ensureExpanded: (id: string) => void;
  displayValues: Map<string, EqValue>;
  cadDisplayValues: Map<string, EqValue>;
  onshapeConns: Map<string, OnshapeConnInfo>;
  onQuantityChange: (itemId: string, quantity: number | null) => void;
  onAddItem: (parentId: string, fileTypeId: string) => Promise<void>;
  onRenameItem: (itemId: string, name: string) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  onLinkCad: (itemId: string) => void;
  canEdit: boolean;
  resolvingId?: string | null;
  onResolve?: (item: Item) => void;
  refreshingCadId?: string | null;
  onRefreshCad?: (item: Item) => void;
}

// ── Ellipsis menu ────────────────────────────────────────────────────────────

interface EllipsisMenuProps {
  item: Item;
  onShowDescription: () => void;
  onAddSubsystem?: () => void;
  onAddPart?: () => void;
  onEditTitle?: () => void;
  onDeleteItem?: () => void;
  onLinkCad?: () => void;
  onResolve?: () => void;
}

function EllipsisMenu({
  item,
  onShowDescription,
  onAddSubsystem,
  onAddPart,
  onEditTitle,
  onDeleteItem,
  onLinkCad,
  onResolve,
}: EllipsisMenuProps) {
  const [open, setOpen] = useState(false);

  function close() {
    setOpen(false);
  }

  const isWorkspace = item.type === "WORKSPACE" || item.type === "PART_TREE";

  return (
    <div
      className="relative shrink-0"
      onClick={(e) => e.stopPropagation()}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        className="flex items-center justify-center w-6 h-6 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
        tabIndex={-1}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal size={14} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-0.5 z-50 min-w-max bg-white border border-gray-200 rounded shadow-md py-1">
          {/* Open link */}
          {item.type === "DOCUMENT" && (
            <a
              href={`/document/${item.slug}`}
              className="block px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 whitespace-nowrap"
              onClick={close}
            >
              Open document
            </a>
          )}
          {item.type === "WORKSPACE" && (
            <a
              href={`/workspace/${item.slug}`}
              className="block px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 whitespace-nowrap"
              onClick={close}
            >
              Open as workspace
            </a>
          )}
          {item.type === "PART_TREE" && (
            <a
              href={`/part-tree/${item.slug}`}
              className="block px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 whitespace-nowrap"
              onClick={close}
            >
              Open as workspace
            </a>
          )}

          {/* Workspace-only actions */}
          {isWorkspace && onAddSubsystem && (
            <button
              className="block w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 whitespace-nowrap"
              onClick={() => {
                close();
                onAddSubsystem();
              }}
            >
              Add Subsystem (Folder)
            </button>
          )}
          {isWorkspace && onAddPart && (
            <button
              className="block w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 whitespace-nowrap"
              onClick={() => {
                close();
                onAddPart();
              }}
            >
              Add Part (Document)
            </button>
          )}

          {/* Edit title */}
          {onEditTitle && (
            <button
              className="block w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 whitespace-nowrap"
              onClick={() => {
                close();
                onEditTitle();
              }}
            >
              Edit title
            </button>
          )}

          {/* Link CAD */}
          {onLinkCad && (
            <button
              className="block w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 whitespace-nowrap"
              onClick={() => {
                close();
                onLinkCad();
              }}
            >
              Link CAD
            </button>
          )}

          {/* Resolve — re-solve with latest imported values */}
          {onResolve && item.type === "DOCUMENT" && (
            <button
              className="block w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 whitespace-nowrap"
              onClick={() => { close(); onResolve(); }}
            >
              Resolve
            </button>
          )}

          {/* Display description */}
          <button
            className="block w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 whitespace-nowrap"
            onClick={() => {
              close();
              onShowDescription();
            }}
          >
            Display description
          </button>

          {onDeleteItem && (
            <button
              className="block w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 whitespace-nowrap"
              onClick={() => {
                close();
                onDeleteItem();
              }}
            >
              {item.type === "DOCUMENT" ? "Delete Part" : "Delete System"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Quantity input ────────────────────────────────────────────────────────────

function QuantityInput({
  item,
  onQuantityChange,
}: {
  item: Item;
  onQuantityChange: (itemId: string, quantity: number | null) => void;
}) {
  const [value, setValue] = useState<string>(
    item.quantity !== undefined ? String(item.quantity) : "",
  );

  async function save() {
    const num = value === "" ? null : Number(value);
    if (num !== null && isNaN(num)) return;
    await fetch(`/api/file/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: num }),
    });
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setValue(raw);
    const num = raw === "" ? null : Number(raw);
    if (num !== null && isNaN(num)) return;
    onQuantityChange(item.id, num);
  }

  return (
    <input
      type="number"
      min={0}
      value={value}
      placeholder="Qty"
      onClick={(e) => e.stopPropagation()}
      onChange={handleChange}
      onBlur={save}
      className="w-16 text-sm text-right border border-gray-300 rounded px-1 py-0.5 shrink-0 focus:outline-none focus:border-blue-400"
    />
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatEqValue(ev: EqValue | undefined): string {
  if (!ev || ev.value === null) return "—";
  const s = Number.isInteger(ev.value)
    ? String(ev.value)
    : parseFloat(ev.value.toPrecision(4)).toString();
  return ev.unit ? `${s} ${ev.unit}` : s;
}

// Column widths — must match header in PartTreeWrapper
const VALUE_COL = "9rem";
const CAD_COL = "8rem";

// ── Tree node ─────────────────────────────────────────────────────────────────

function TreeNode({
  item,
  childrenMap,
  depth,
  selectedId,
  onSelect,
  expandedIds,
  toggleExpand,
  ensureExpanded,
  displayValues,
  cadDisplayValues,
  onshapeConns,
  onQuantityChange,
  onAddItem,
  onRenameItem,
  onDeleteItem,
  onLinkCad,
  canEdit,
  resolvingId,
  onResolve,
  refreshingCadId,
  onRefreshCad,
}: TreeNodeProps) {
  const children = childrenMap.get(item.id) ?? [];
  const hasChildren = children.length > 0;
  const isExpanded = expandedIds.has(item.id);
  const isSelected = selectedId === item.id;
  const isWorkspace = item.type === "WORKSPACE";

  const [showDescription, setShowDescription] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(item.name);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Keep title in sync if parent renames it
  useEffect(() => {
    setTitleValue(item.name);
  }, [item.name]);

  useEffect(() => {
    if (isEditingTitle) titleInputRef.current?.focus();
  }, [isEditingTitle]);

  async function commitTitle() {
    setIsEditingTitle(false);
    if (titleValue.trim() && titleValue.trim() !== item.name) {
      await onRenameItem(item.id, titleValue);
    } else {
      setTitleValue(item.name);
    }
  }

  async function handleAddSubsystem() {
    await onAddItem(item.id, "Workspace");
    ensureExpanded(item.id);
  }

  async function handleAddPart() {
    await onAddItem(item.id, "Document");
    ensureExpanded(item.id);
  }

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-1.5 cursor-pointer transition-colors border-b border-gray-200 ${
          isSelected
            ? "bg-blue-50 text-blue-700"
            : "hover:bg-gray-100 text-gray-700"
        }`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => onSelect(item.id)}
      >
        <span
          className="w-4 h-4 flex items-center justify-center shrink-0 text-gray-400"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) toggleExpand(item.id);
          }}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown size={15} />
            ) : (
              <ChevronRight size={15} />
            )
          ) : null}
        </span>

        <ItemIcon type={item.type} />

        {isEditingTitle ? (
          <input
            ref={titleInputRef}
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitTitle();
              if (e.key === "Escape") {
                setTitleValue(item.name);
                setIsEditingTitle(false);
              }
              e.stopPropagation();
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 text-base border border-blue-400 rounded px-1 py-0 focus:outline-none"
          />
        ) : (
          <span className="text-base truncate flex-1">{item.name}</span>
        )}

        {/* CAD thumbnail — inline, just right of name */}
        {(() => {
          const conn = onshapeConns.get(item.id);
          if (!conn) return null;
          const src = conn.thumbnailUrl
            ? `/api/onshape/thumbnail?url=${encodeURIComponent(conn.thumbnailUrl)}`
            : `/api/onshape/thumbnail?${new URLSearchParams({ documentId: conn.documentId, workspaceId: conn.workspaceId, ...(conn.elementId ? { elementId: conn.elementId } : {}) })}`;
          return (
            <div className="flex items-center gap-1.5 shrink-0">
              {conn.elementName && (
                <span
                  className="text-xs text-gray-500 truncate max-w-[8rem]"
                  title={conn.elementName}
                >
                  {conn.elementName}
                </span>
              )}
              <img
                src={src}
                alt={conn.elementName ?? item.name}
                className="h-7 w-12 object-contain rounded border border-gray-200 bg-gray-50"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          );
        })()}

        {/* Value to Sum column */}
        <span
          className="text-sm text-gray-500 text-center shrink-0"
          style={{ width: VALUE_COL }}
        >
          {formatEqValue(displayValues.get(item.id))}
        </span>

        {/* CAD Value column */}
        <div
          className="flex items-center justify-between shrink-0 gap-1"
          style={{ width: CAD_COL }}
        >
          <span className="text-sm text-gray-500 truncate">
            {formatEqValue(cadDisplayValues.get(item.id))}
          </span>
          {item.type === "DOCUMENT" && onshapeConns.has(item.id) && onRefreshCad && (
            <button
              onClick={(e) => { e.stopPropagation(); onRefreshCad(item); }}
              disabled={refreshingCadId === item.id}
              title={item.importedCadFetchedAt
                ? `Last fetched: ${new Date(item.importedCadFetchedAt).toLocaleString()}`
                : "Fetch CAD properties"}
              className="shrink-0 text-gray-400 hover:text-blue-600 disabled:opacity-40"
            >
              {refreshingCadId === item.id
                ? <Loader2 size={12} className="animate-spin" />
                : <RefreshCw size={12} />}
            </button>
          )}
        </div>

        <QuantityInput item={item} onQuantityChange={onQuantityChange} />

        {item.needsUpdate ? (
          <div className="flex items-center gap-1 shrink-0">
            <XCircle size={16} className="text-red-500" />
            {onResolve && item.type === "DOCUMENT" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onResolve(item);
                }}
                disabled={resolvingId === item.id}
                title="Re-solve with latest imported values"
                className="flex items-center gap-0.5 text-xs text-orange-600 hover:text-orange-800 disabled:opacity-50"
              >
                {resolvingId === item.id ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <RefreshCw size={12} />
                )}
              </button>
            )}
          </div>
        ) : (
          <CheckCircle2 size={16} className="shrink-0 text-green-500" />
        )}

        <EllipsisMenu
          item={item}
          onShowDescription={() => setShowDescription((v) => !v)}
          onAddSubsystem={isWorkspace ? handleAddSubsystem : undefined}
          onAddPart={isWorkspace ? handleAddPart : undefined}
          onEditTitle={() => setIsEditingTitle(true)}
          onLinkCad={() => onLinkCad(item.id)}
          onDeleteItem={
            (isWorkspace && !hasChildren) ||
            (item.type === "DOCUMENT" && canEdit)
              ? () => onDeleteItem(item.id)
              : undefined
          }
          onResolve={onResolve && item.type === "DOCUMENT" ? () => onResolve(item) : undefined}
        />
      </div>

      {showDescription && (
        <div
          className="px-4 py-2 text-sm text-gray-500 bg-gray-50 border-b border-gray-200"
          style={{ paddingLeft: `${8 + depth * 16 + 24}px` }}
        >
          {item.description ?? <span className="italic">No description</span>}
        </div>
      )}

      {hasChildren && isExpanded && (
        <div>
          {children.map((child) => (
            <TreeNode
              key={child.id}
              item={child}
              childrenMap={childrenMap}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
              ensureExpanded={ensureExpanded}
              displayValues={displayValues}
              cadDisplayValues={cadDisplayValues}
              onshapeConns={onshapeConns}
              onQuantityChange={onQuantityChange}
              onAddItem={onAddItem}
              onRenameItem={onRenameItem}
              onDeleteItem={onDeleteItem}
              onLinkCad={onLinkCad}
              canEdit={canEdit}
              resolvingId={resolvingId}
              onResolve={onResolve}
              refreshingCadId={refreshingCadId}
              onRefreshCad={onRefreshCad}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Root nav ──────────────────────────────────────────────────────────────────

export default function PartTreeNav({
  root,
  childrenMap,
  selectedId,
  onSelect,
  displayValues,
  cadDisplayValues,
  anyStale,
  onshapeConns,
  onQuantityChange,
  onAddItem,
  onRenameItem,
  onDeleteItem,
  onLinkCad,
  canEdit,
  resolvingId,
  onResolve,
  refreshingCadId,
  onRefreshCad,
}: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(childrenMap.keys()),
  );
  const [showRootDescription, setShowRootDescription] = useState(false);
  const [isEditingRootTitle, setIsEditingRootTitle] = useState(false);
  const [rootTitleValue, setRootTitleValue] = useState(root.name);
  const rootTitleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingRootTitle) rootTitleInputRef.current?.focus();
  }, [isEditingRootTitle]);

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function ensureExpanded(id: string) {
    setExpandedIds((prev) => (prev.has(id) ? prev : new Set([...prev, id])));
  }

  async function commitRootTitle() {
    setIsEditingRootTitle(false);
    if (rootTitleValue.trim() && rootTitleValue.trim() !== root.name) {
      await onRenameItem(root.id, rootTitleValue);
    } else {
      setRootTitleValue(root.name);
    }
  }

  async function handleAddSubsystemToRoot() {
    await onAddItem(root.id, "Workspace");
    ensureExpanded(root.id);
  }

  async function handleAddPartToRoot() {
    await onAddItem(root.id, "Document");
    ensureExpanded(root.id);
  }

  const rootChildren = childrenMap.get(root.id) ?? [];

  return (
    <div className="flex-1">
      {/* Root node */}
      <div
        className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors border-b border-gray-200 ${
          selectedId === root.id
            ? "bg-blue-50 text-blue-700"
            : "hover:bg-gray-50 text-gray-800"
        }`}
        onClick={() => onSelect(root.id)}
      >
        <ItemIcon type={root.type} />

        {isEditingRootTitle ? (
          <input
            ref={rootTitleInputRef}
            value={rootTitleValue}
            onChange={(e) => setRootTitleValue(e.target.value)}
            onBlur={commitRootTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRootTitle();
              if (e.key === "Escape") {
                setRootTitleValue(root.name);
                setIsEditingRootTitle(false);
              }
              e.stopPropagation();
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 text-base font-semibold border border-blue-400 rounded px-1 py-0 focus:outline-none"
          />
        ) : (
          <span className="text-base font-semibold truncate flex-1">
            {root.name}
          </span>
        )}

        {/* CAD thumbnail — inline, just right of name */}
        {(() => {
          const conn = onshapeConns.get(root.id);
          if (!conn) return null;
          const src = conn.thumbnailUrl
            ? `/api/onshape/thumbnail?url=${encodeURIComponent(conn.thumbnailUrl)}`
            : `/api/onshape/thumbnail?${new URLSearchParams({ documentId: conn.documentId, workspaceId: conn.workspaceId, ...(conn.elementId ? { elementId: conn.elementId } : {}) })}`;
          return (
            <div className="flex items-center gap-1.5 shrink-0">
              <img
                src={src}
                alt={conn.elementName ?? root.name}
                className="h-7 w-12 object-contain rounded border border-gray-200 bg-gray-50"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
              {conn.elementName && (
                <span
                  className="text-xs text-gray-500 truncate max-w-[8rem]"
                  title={conn.elementName}
                >
                  {conn.elementName}
                </span>
              )}
            </div>
          );
        })()}

        <span
          className="text-sm text-gray-500 font-medium text-center shrink-0"
          style={{ width: VALUE_COL }}
        >
          {formatEqValue(displayValues.get(root.id))}
        </span>

        {/* CAD Value column + qty spacer */}
        <span
          className="text-sm text-gray-500 text-center shrink-0"
          style={{ width: CAD_COL }}
        >
          {formatEqValue(cadDisplayValues.get(root.id))}
        </span>
        <div className="w-16 shrink-0" />

        {anyStale ? (
          <XCircle size={16} className="shrink-0 text-red-500" />
        ) : (
          <CheckCircle2 size={16} className="shrink-0 text-green-500" />
        )}

        <EllipsisMenu
          item={root}
          onShowDescription={() => setShowRootDescription((v) => !v)}
          onAddSubsystem={handleAddSubsystemToRoot}
          onAddPart={handleAddPartToRoot}
          onEditTitle={() => setIsEditingRootTitle(true)}
          onLinkCad={() => onLinkCad(root.id)}
        />
      </div>

      {showRootDescription && (
        <div className="px-4 py-2 text-sm text-gray-500 bg-gray-50 border-b border-gray-200">
          {root.description ?? <span className="italic">No description</span>}
        </div>
      )}

      {/* Children */}
      <div>
        {rootChildren.map((child) => (
          <TreeNode
            key={child.id}
            item={child}
            childrenMap={childrenMap}
            depth={0}
            selectedId={selectedId}
            onSelect={onSelect}
            expandedIds={expandedIds}
            toggleExpand={toggleExpand}
            ensureExpanded={ensureExpanded}
            displayValues={displayValues}
            cadDisplayValues={cadDisplayValues}
            onshapeConns={onshapeConns}
            onQuantityChange={onQuantityChange}
            onAddItem={onAddItem}
            onRenameItem={onRenameItem}
            onDeleteItem={onDeleteItem}
            onLinkCad={onLinkCad}
            canEdit={canEdit}
            resolvingId={resolvingId}
            onResolve={onResolve}
            refreshingCadId={refreshingCadId}
            onRefreshCad={onRefreshCad}
          />
        ))}
      </div>
    </div>
  );
}
