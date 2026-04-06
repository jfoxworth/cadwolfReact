"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  AlignLeft, Heading, FunctionSquare, Sigma, SlidersHorizontal,
  ToggleLeft, ChevronDown, Repeat, GitBranch, RefreshCw,
  LineChart, Image as ImageIcon, Video, Minus, CreditCard,
  Settings, Eye, List, Link as LinkIcon, BookMarked, Code, LogIn, Database, Package, Network,
  Lock, LockOpen, History, AlertTriangle,
} from "lucide-react";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import type { DocumentPageData, BlockType, VirtualBlock } from "@/types/document";
import BlockSettingsModal from "@/components/document/BlockSettingsModal";
import type { ModelView } from "@/components/document/blocks/equation";
import { useSideMenuAdd, type AddItem } from "@/context/SideMenuAddContext";
import { BLOCK_TYPE_TO_COMPONENT_ID } from "@/utils/transformers";
import { rawToLatex } from "@/utils/rawToLatex";
import type { SolverLocation, TocSettings, FunctionSettings, ImportedFunction } from "@/types/item";
import type { ImportedFunction as SolverImportedFunction } from "@/solver/types";
import DocumentPropertiesModal from "./DocumentPropertiesModal";
import DocumentHideShowModal from "./DocumentHideShowModal";
import DocumentTocModal from "./DocumentTocModal";
import DocumentTableOfContents from "./DocumentTableOfContents";
import DocumentFunctionModal from "./DocumentFunctionModal";
import DocumentBibliographyModal, { type BibEntry } from "./DocumentBibliographyModal";
import DocumentFileInputsModal, { type FileImportEntry, type SolvedImportResult } from "./DocumentFileInputsModal";
import DocumentDatasetInputsModal, { type DatasetImportEntry } from "./DocumentDatasetInputsModal";
import DocumentDependentFilesModal from "./DocumentDependentFilesModal";
import DocumentImportedFunctionsModal from "./DocumentImportedFunctionsModal";
import DocumentCadModal from "./DocumentCadModal";
import VersionHistoryPanel from "./VersionHistoryPanel";
import type { Editor } from "@tiptap/react";
import TextBlock from "./blocks/text";
import HeaderBlock from "./blocks/header";
import EquationBlock from "./blocks/equation";
import SymbolicEquationBlock from "./blocks/symbolicEquation";
import SliderBlock from "./blocks/slider";
import SelectBlock from "./blocks/selectBlock";
import DropdownBlock from "./blocks/dropdown";
import ForLoopBlock, { type ForLoopDef } from "./blocks/forLoop";
import IfElseBlock from "./blocks/ifElse";
import WhileLoopBlock, { type WhileLoopDef } from "./blocks/whileLoop";
import CardBlock, { type EquationOption } from "./blocks/card";
import PlotBlock from "./blocks/plot";
import ImageBlock from "./blocks/image";
import VideoBlock from "./blocks/video";
import LineBreakBlock from "./blocks/lineBreak";
import { useSolver } from "./hooks/useSolver";

export type SelectBlockFn = (id: string | null) => void;
export type StartEditingFn = (id: string, html: string) => void;
export type SaveFn = () => void;

// ── Default definitions for each block type ────────────────────────────────
function defaultDefinition(type: BlockType): Record<string, unknown> {
  switch (type) {
    case "TEXT":     return { text: "", width: "full" };
    case "HEADER":   return { text: "New Header", level: 2, width: "full" };
    case "EQUATION": return { raw: "newEq=1 m", displayEq: rawToLatex("newEq=1 m"), width: "full" };
    case "SLIDER":   return { variableName: "x", min: 0, max: 10, step: 1, value: 5, unit: "", orientation: "horizontal", width: "full" };
    case "DROPDOWN": return { variableName: "x", options: ["1", "2", "3"], selectedIndex: 0, width: "full" };
    case "SELECT_BLOCK": return { variableName: "x", options: ["1", "2", "3"], selectedIndex: 0, width: "full" };
    case "FOR_LOOP":    return { variable: "x", start: "0", end: "10", step: "1", children: [], width: "full" };
    case "WHILE_LOOP":  return { lhs: "err", operator: ">", rhs: "0.001", maxIterations: 1000, children: [], width: "full" };
    case "CARD":        return { equationBlockId: null, width: "full" };
    default:            return { width: "full" };
  }
}

// Build the synthetic "raw equation" string for input blocks (SLIDER, DROPDOWN, SELECT_BLOCK)
// so the solver treats them like normal equations.
function inputBlockRaw(type: string, def: Record<string, unknown>): string {
  const name = (def.variableName as string) || "_";
  if (type === "SLIDER") {
    const value = def.value ?? 0;
    const unit  = def.unit ? ` ${def.unit}` : "";
    return `${name} = ${value}${unit}`;
  }
  if (type === "DROPDOWN" || type === "SELECT_BLOCK") {
    const options = (def.options as string[]) ?? [];
    const idx     = (def.selectedIndex as number) ?? 0;
    const selected = options[idx] ?? "0";
    return `${name} = ${selected}`;
  }
  return (def.raw as string) ?? "";
}

const INPUT_BLOCK_TYPES = new Set(["SLIDER", "DROPDOWN", "SELECT_BLOCK"]);

// ── Build a flat list of solver blocks, including synthetic blocks for ─────────
// FOR_LOOP start / end / step expressions (so the main solver resolves them).
function buildSolverBlocks(vblocks: VirtualBlock[]): {
  id: string;
  order: number;
  type: string;
  definition: { raw?: string; variableName?: string; unit?: string };
}[] {
  const out: ReturnType<typeof buildSolverBlocks> = [];
  for (const b of vblocks) {
    if (b._status === "deleted") continue;
    if (b.type === "EQUATION") {
      out.push({ id: b.id, order: b.order, type: b.type, definition: b.definition as { raw?: string } });
    } else if (INPUT_BLOCK_TYPES.has(b.type)) {
      out.push({ id: b.id, order: b.order, type: b.type, definition: { ...b.definition, raw: inputBlockRaw(b.type, b.definition) } });
    } else if (b.type === "FOR_LOOP") {
      const def = b.definition as Partial<ForLoopDef>;
      // Use a short deterministic prefix so synthetic var names don't clash with user vars
      const pfx = `_fl${b.id.replace(/[^a-z0-9]/gi, "").slice(0, 6)}_`;
      if (def.start?.trim()) out.push({ id: `${b.id}:start`, order: b.order, type: "EQUATION", definition: { raw: `${pfx}s = ${def.start}` } });
      if (def.end?.trim())   out.push({ id: `${b.id}:end`,   order: b.order, type: "EQUATION", definition: { raw: `${pfx}e = ${def.end}` } });
      if (def.step?.trim())  out.push({ id: `${b.id}:step`,  order: b.order, type: "EQUATION", definition: { raw: `${pfx}t = ${def.step}` } });
      // Emit final-value synthetics from the last Run so downstream equations can reference them.
      const finalValues = (def as { finalValues?: Record<string, number> }).finalValues;
      if (finalValues) {
        for (const [varName, val] of Object.entries(finalValues)) {
          if (varName.startsWith("_")) continue;
          out.push({
            id: `${b.id}:final:${varName}`,
            order: b.order + 0.001,
            type: "EQUATION",
            definition: { raw: `${varName} = ${val}` },
          });
        }
      }
    } else if (b.type === "WHILE_LOOP") {
      const def = b.definition as Partial<WhileLoopDef>;
      // Emit one synthetic equation per final value so blocks below can reference them.
      // Order is fractionally above the while loop block so they're visible downstream.
      if (def.finalValues) {
        for (const [varName, val] of Object.entries(def.finalValues)) {
          if (varName.startsWith("_")) continue;
          out.push({
            id: `${b.id}:final:${varName}`,
            order: b.order + 0.001,
            type: "EQUATION",
            definition: { raw: `${varName} = ${val}` },
          });
        }
      }
    } else if (b.type === "IF_ELSE") {
      const def = b.definition as { finalValues?: Record<string, number> };
      if (def.finalValues) {
        for (const [varName, val] of Object.entries(def.finalValues)) {
          if (varName.startsWith("_")) continue;
          out.push({
            id: `${b.id}:final:${varName}`,
            order: b.order + 0.001,
            type: "EQUATION",
            definition: { raw: `${varName} = ${val}` },
          });
        }
      }
    }
  }
  return out;
}

interface RenderBlockOptions {
  block: VirtualBlock;
  canEdit: boolean;
  isSelected: boolean;
  isEditing: boolean;
  sharedEditor: Editor | null;
  onSelect: SelectBlockFn;
  onStartEditing: StartEditingFn;
  onSave: SaveFn;
  displayHtml?: string;
  solverResults?: ReturnType<typeof useSolver>["results"];
  onRawChange?: (blockId: string, newRaw: string, newDisplayEq: string) => void;
  onViewerRawChange?: (blockId: string, newRaw: string, newDisplayEq: string) => void;
  onSliderChange?: (blockId: string, newValue: number) => void;
  onDefinitionChange?: (blockId: string, newDef: Record<string, unknown>) => void;
  onDeleteBlock?: (blockId: string) => void;
  onResolve?: (blockId: string) => void;
  equationOptions?: EquationOption[];
  onMoveBlock?: (blockId: string, newIndex: number) => void;
  moveInfo?: { currentIndex: number; total: number; options: { index: number; label: string }[] };
  settingsOpenId?: string | null;
  onToggleSettings?: (blockId: string) => void;
  modelView?: ModelView;
  onModelViewChange?: (blockId: string, view: ModelView) => void;
  canUpload?: boolean;
  staleVarNames?: Set<string>;
}

function getBlockLabel(block: VirtualBlock): string {
  switch (block.type) {
    case "EQUATION":    return ((block.definition.raw as string) ?? "").split("=")[0].trim() || "Equation";
    case "HEADER":      return ((block.definition.text as string) ?? "").slice(0, 30) || "Header";
    case "TEXT":        return "Text";
    case "SLIDER":      return (block.definition.variableName as string) ?? "Slider";
    case "DROPDOWN":    return (block.definition.variableName as string) ?? "Dropdown";
    case "SELECT_BLOCK":return (block.definition.variableName as string) ?? "Select";
    case "FOR_LOOP":    return "For loop";
    case "WHILE_LOOP":  return "While loop";
    case "IF_ELSE":     return "If / Else";
    case "CARD":        return "Card";
    case "PLOT":        return "Plot";
    case "IMAGE":       return "Image";
    case "VIDEO":       return "Video";
    case "LINE_BREAK":  return "Line break";
    default:            return block.type;
  }
}

const BLOCK_WIDTHS: { label: string; value: string; colSpan: string }[] = [
  { label: "Full", value: "full", colSpan: "col-span-12" },
  { label: "3/4",  value: "3/4",  colSpan: "col-span-9"  },
  { label: "1/2",  value: "1/2",  colSpan: "col-span-6"  },
  { label: "1/3",  value: "1/3",  colSpan: "col-span-4"  },
  { label: "1/4",  value: "1/4",  colSpan: "col-span-3"  },
];

function renderBlock({
  block,
  canEdit,
  isSelected,
  isEditing,
  sharedEditor,
  onSelect,
  onStartEditing,
  onSave,
  displayHtml,
  solverResults,
  onRawChange,
  onViewerRawChange,
  onSliderChange,
  onDefinitionChange,
  onDeleteBlock,
  onResolve,
  equationOptions,
  onMoveBlock,
  moveInfo,
  settingsOpenId,
  onToggleSettings,
  modelView,
  onModelViewChange,
  canUpload = false,
  staleVarNames,
}: RenderBlockOptions) {
  if (block._status === "deleted") return null;

  const blockWidth = (block.definition.width as string) ?? "full";
  const colSpan = BLOCK_WIDTHS.find((w) => w.value === blockWidth)?.colSpan ?? "col-span-12";

  let inner: React.ReactNode;
  switch (block.type) {
    case "TEXT":
      inner = (
        <TextBlock
          block={block}
          edit={canEdit}
          isSelected={isSelected}
          isEditing={isEditing}
          editor={sharedEditor}
          onSelect={onSelect}
          onStartEditing={onStartEditing}
          onSave={onSave}
          displayHtml={displayHtml}
        />
      );
      break;
    case "HEADER":
      inner = (
        <HeaderBlock
          block={block}
          edit={canEdit}
          isSelected={isSelected}
          onSelect={onSelect}
          onDefinitionChange={onDefinitionChange}
        />
      );
      break;
    case "EQUATION":
      inner = (
        <EquationBlock
          block={block}
          result={solverResults?.get(block.id)}
          isSolving={block._solving ?? false}
          canEdit={canEdit}
          isSelected={isSelected}
          onSelect={onSelect}
          onRawChange={onRawChange}
          onViewerRawChange={onViewerRawChange}
          onResolve={onResolve}
          modelView={modelView}
          staleVarNames={staleVarNames}
        />
      );
      break;
    case "SYMBOLIC_EQUATION":
      inner = (
        <SymbolicEquationBlock
          block={block}
          canEdit={canEdit}
          isSelected={isSelected}
          onSelect={onSelect}
          onDefinitionChange={onDefinitionChange}
        />
      );
      break;
    case "SLIDER":
      inner = (
        <SliderBlock
          block={block}
          canEdit={canEdit}
          isSelected={isSelected}
          onSelect={onSelect}
          onSliderChange={onSliderChange ?? (() => {})}
          onDefinitionChange={onDefinitionChange ?? (() => {})}
        />
      );
      break;
    case "SELECT_BLOCK":
      inner = (
        <SelectBlock
          block={block}
          canEdit={canEdit}
          isSelected={isSelected}
          onSelect={onSelect}
          onDefinitionChange={onDefinitionChange ?? (() => {})}
        />
      );
      break;
    case "DROPDOWN":
      inner = (
        <DropdownBlock
          block={block}
          canEdit={canEdit}
          isSelected={isSelected}
          onSelect={onSelect}
          onDefinitionChange={onDefinitionChange ?? (() => {})}
        />
      );
      break;
    case "FOR_LOOP":
      inner = (
        <ForLoopBlock
          block={block}
          canEdit={canEdit}
          isSelected={isSelected}
          onSelect={onSelect}
          onDefinitionChange={onDefinitionChange}
          solverResults={solverResults}
        />
      );
      break;
    case "IF_ELSE":
      inner = (
        <IfElseBlock
          block={block}
          canEdit={canEdit}
          isSelected={isSelected}
          onSelect={onSelect}
          onDefinitionChange={onDefinitionChange}
          solverResults={solverResults}
        />
      );
      break;
    case "WHILE_LOOP":
      inner = (
        <WhileLoopBlock
          block={block}
          canEdit={canEdit}
          isSelected={isSelected}
          onSelect={onSelect}
          onDefinitionChange={onDefinitionChange}
          solverResults={solverResults}
        />
      );
      break;
    case "CARD":
      inner = (
        <CardBlock
          block={block}
          canEdit={canEdit}
          isSelected={isSelected}
          onSelect={onSelect}
          onDefinitionChange={onDefinitionChange}
          solverResults={solverResults}
          equationOptions={equationOptions}
        />
      );
      break;
    case "PLOT":
      inner = (
        <PlotBlock
          block={block}
          solverResults={solverResults}
          canEdit={canEdit}
          isSelected={isSelected}
          onSelect={onSelect}
          onDefinitionChange={onDefinitionChange}
        />
      );
      break;
    case "IMAGE":
      inner = (
        <ImageBlock
          block={block}
          edit={canEdit}
          isSelected={isSelected}
          onSelect={onSelect}
          onDefinitionChange={onDefinitionChange}
          canUpload={canUpload}
        />
      );
      break;
    case "VIDEO":
      inner = (
        <VideoBlock
          block={block}
          edit={canEdit}
          isSelected={isSelected}
          onSelect={onSelect}
          onDefinitionChange={onDefinitionChange}
        />
      );
      break;
    case "LINE_BREAK":
      inner = (
        <LineBreakBlock
          blockId={block.id}
          isSelected={isSelected}
          canEdit={canEdit}
          onSelect={onSelect}
          onDelete={onDeleteBlock ? () => onDeleteBlock(block.id) : undefined}
        />
      );
      break;
    default:
      return null;
  }

  const settingsOpen = settingsOpenId === block.id;

  return (
    <div key={block.id} id={block.id} className={`${colSpan} relative group/block`}>
      {inner}
      {canEdit && block.type !== "LINE_BREAK" && (
        <div className="absolute top-1 right-1 z-10">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSettings?.(block.id); }}
            title="Block settings"
            className="p-1 rounded text-blue-400 hover:text-blue-600 hover:bg-blue-100 opacity-0 group-hover/block:opacity-100 transition-opacity"
          >
            <Settings size={16} />
          </button>
          {settingsOpen && onDefinitionChange && onMoveBlock && onDeleteBlock && (
            <BlockSettingsModal
              block={block}
              moveInfo={moveInfo ? { currentIndex: moveInfo.currentIndex, total: moveInfo.total, options: moveInfo.options } : undefined}
              modelView={modelView}
              onModelViewChange={onModelViewChange}
              onDefinitionChange={onDefinitionChange}
              onMoveBlock={onMoveBlock}
              onDeleteBlock={onDeleteBlock}
              onClose={() => onToggleSettings?.(block.id)}
            />
          )}
        </div>
      )}
    </div>
  );
}

interface LockInfo {
  lockedBy: number | null;
  lockedAt: string | null;
  lockedByName: string | null;
  isLockedByMe: boolean;
}

interface DocumentWrapperProps {
  data: DocumentPageData;
  canEdit: boolean;
  lockInfo?: LockInfo;
  canUpload?: boolean;
}

export default function DocumentWrapper({
  data,
  canEdit,
  lockInfo: initialLockInfo,
  canUpload = false,
}: DocumentWrapperProps) {
  const { document } = data;

  // ── Checkout / lock state ────────────────────────────────────────────────
  const [lockInfo, setLockInfo] = useState<LockInfo>(
    initialLockInfo ?? { lockedBy: null, lockedAt: null, lockedByName: null, isLockedByMe: false },
  );
  const [lockLoading, setLockLoading] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  // Effective edit permission: must have edit permission AND hold the checkout
  const effectiveCanEdit = canEdit && lockInfo.isLockedByMe;

  const handleCheckout = async () => {
    setLockLoading(true);
    try {
      const res = await fetch(`/api/file/${document.id}/checkout`, { method: "POST" });
      if (res.ok) {
        const data = await res.json() as { lockedBy: number; lockedAt: string };
        setLockInfo({ lockedBy: data.lockedBy, lockedAt: data.lockedAt, lockedByName: null, isLockedByMe: true });
        window.location.reload();
      } else {
        const err = await res.json() as { error: string; lockedByName?: string; lockedAt?: string };
        alert(`Cannot check out: ${err.error}${err.lockedByName ? ` (checked out by ${err.lockedByName})` : ""}`);
      }
    } finally {
      setLockLoading(false);
    }
  };

  const handleCheckin = async () => {
    // Save any dirty blocks first, then check in
    await handlePersistRef.current();
    setLockLoading(true);
    try {
      const res = await fetch(`/api/file/${document.id}/checkin`, { method: "POST" });
      if (res.ok) {
        const data = await res.json() as { version: number };
        setLockInfo({ lockedBy: null, lockedAt: null, lockedByName: null, isLockedByMe: false });
        setSaveStatus("saved");
        // Brief toast to indicate version bump
        console.info(`Checked in at v${data.version}`);
        window.location.reload();
      }
    } finally {
      setLockLoading(false);
    }
  };

  const handleDiscard = async () => {
    if (!window.confirm("Discard your checkout? Any unsaved changes will remain but the lock will be released.")) return;
    setLockLoading(true);
    try {
      const res = await fetch(`/api/file/${document.id}/discard`, { method: "POST" });
      if (res.ok) {
        setLockInfo({ lockedBy: null, lockedAt: null, lockedByName: null, isLockedByMe: false });
      }
    } finally {
      setLockLoading(false);
    }
  };

  // ── Virtual DOM ─────────────────────────────────────────────────────────
  // Local mutable copy of blocks. DB writes are deferred until Save.
  const [virtualBlocks, setVirtualBlocks] = useState<VirtualBlock[]>(
    () => data.blocks.map((b) => ({ ...b, _status: "clean" as const })),
  );

  // ── File Imports (declared early so solver can include them) ──────────────
  const [fileImports, setFileImports] = useState<FileImportEntry[]>(data.fileImports as FileImportEntry[]);
  const [showFileInputs, setShowFileInputs] = useState(false);

  // ── checkUpdates — pull fresh values from source files at load time ────────
  // Mirrors checkUpdates() from the original Angular codebase (FlagDocumentDependents → checkUpdates).
  // If this document is stale (file.needsUpdate), fetch current solved values from each source
  // file, compare against stored values, and set per-import needsUpdate accordingly.
  useEffect(() => {
    const uniqueSourceIds = [...new Set(data.fileImports.map((fi) => fi.sourceFileId))];
    if (uniqueSourceIds.length === 0) return;

    let cancelled = false;

    (async () => {
      const fetchedMaps = await Promise.all(
        uniqueSourceIds.map(async (srcId) => {
          try {
            const res = await fetch(`/api/file/${srcId}/exported-values`);
            if (!res.ok) return { srcId, values: {} as Record<string, { value: string; units: string | null }> };
            return { srcId, values: await res.json() as Record<string, { value: string; units: string | null }> };
          } catch {
            return { srcId, values: {} as Record<string, { value: string; units: string | null }> };
          }
        }),
      );
      if (cancelled) return;

      const valuesBySource = new Map(fetchedMaps.map((m) => [m.srcId, m.values]));

      setFileImports((prev) => {
        const updated = prev.map((fi) => {
          const sourceValues = valuesBySource.get(fi.sourceFileId);
          if (!sourceValues) return fi;

          // Find the exported value case-insensitively
          const key = Object.keys(sourceValues).find(
            (k) => k.toLowerCase() === fi.sourceVariableName.toLowerCase(),
          );
          if (!key) return fi;

          const fetched = sourceValues[key];
          const changed = fetched.value !== fi.value || fetched.units !== fi.units;
          return {
            ...fi,
            value: fetched.value,
            units: fetched.units,
            // Always clear in local state — values are refreshed now and will be re-solved.
            needsUpdate: false,
          };
        });

        // Persist updated values to DB. needsUpdate cleared since we've refreshed.
        updated.forEach((fi, idx) => {
          const prev_fi = prev[idx];
          const changed = fi.value !== prev_fi.value || fi.units !== prev_fi.units;
          if (changed || prev_fi.needsUpdate) {
            fetch(`/api/file-import/${fi.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ value: fi.value, units: fi.units, needsUpdate: false }),
            }).catch(() => {});
          }
        });

        return updated;
      });

      // Clear the file-level stale flag
      fetch(`/api/file/${document.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ needsUpdate: false }),
      }).catch(() => {});
    })();

    return () => { cancelled = true; };
  // Run once on mount only — document.needsUpdate is the initial server-rendered value
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Synthetic VirtualBlocks for imported variables — injected at negative orders
  // so they resolve before every real block in the document.
  const importSolverBlocks = useMemo<VirtualBlock[]>(
    () =>
      fileImports
        .filter((fi) => fi.value !== null)
        .map((fi, idx) => ({
          id:         `import-${fi.id}`,
          refId:      "",
          type:       "EQUATION" as BlockType,
          order:      -(fileImports.length - idx),
          definition: { raw: `${fi.localAlias} = ${fi.value}${fi.units ? " " + fi.units : ""}`, displayEq: "" },
          _status:    "clean" as const,
        })),
    [fileImports],
  );

  // ── Dataset Imports (declared early so solver can include them) ───────────
  const [datasetImports, setDatasetImports] = useState<DatasetImportEntry[]>(data.datasetImports as DatasetImportEntry[]);
  const [showDatasetInputs, setShowDatasetInputs] = useState(false);

  // ── Dependent Files ───────────────────────────────────────────────────────
  const [showDependentFiles, setShowDependentFiles] = useState(false);

  // ── CAD Connections ───────────────────────────────────────────────────────
  const [showCadModal, setShowCadModal] = useState(false);
  const [cadConnections, setCadConnections] = useState<Array<{ id: number; cadType: string; info: Record<string, unknown> }>>([]);
  const [pushStatus, setPushStatus] = useState<Record<number, { pushed?: number; error?: string }>>({});
  const [localImportedCad, setLocalImportedCad] = useState(document.importedCad);
  const [refreshingCad, setRefreshingCad] = useState(false);

  const handleDeleteLegacyEntry = useCallback(async (eqname: string) => {
    await fetch(`/api/file/${document.id}/refresh-cad-properties?eqname=${encodeURIComponent(eqname)}`, { method: "DELETE" });
    setLocalImportedCad((prev) => prev?.filter((e) => e.eqname !== eqname) ?? []);
  }, [document.id]);

  const handleRefreshCad = useCallback(async () => {
    setRefreshingCad(true);
    try {
      const res = await fetch(`/api/file/${document.id}/refresh-cad-properties`, { method: "POST" });
      if (!res.ok) return;
      const data = await res.json() as { importedCad: typeof document.importedCad };
      setLocalImportedCad(data.importedCad);
    } finally {
      setRefreshingCad(false);
    }
  }, [document.id]);

  // Fetch CAD connections on page load
  useEffect(() => {
    fetch(`/api/cad-connection?fileId=${document.id}`)
      .then((r) => r.json())
      .then((data) => setCadConnections(data as typeof cadConnections))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [document.id]);

  // Synthetic VirtualBlocks for imported datasets — injected at negative orders.
  // Datasets with 2D structure are encoded as matrix literals [r0c0,...;r1c0,...;...].
  const datasetSolverBlocks = useMemo<VirtualBlock[]>(
    () =>
      datasetImports
        .filter((di) => di.cachedValues !== null)
        .map((di, idx) => {
          let arrayStr = "[]";
          try {
            const parsed = JSON.parse(di.cachedValues!);
            if (Array.isArray(parsed)) {
              // Legacy flat-array format → row vector
              arrayStr = `[${parsed.join(", ")}]`;
            } else if (parsed.real && parsed.size) {
              // 2D format {real, size} → build semicolon-separated matrix literal
              const [rowsStr, colsStr] = (parsed.size as string).split("x");
              const rows = parseInt(rowsStr, 10) || 0;
              const cols = parseInt(colsStr, 10) || 0;
              const real = parsed.real as Record<string, string>;
              const rowStrs: string[] = [];
              for (let r = 0; r < rows; r++) {
                const cells: string[] = [];
                for (let c = 0; c < cols; c++) cells.push(real[`${r}-${c}`] ?? "0");
                rowStrs.push(cells.join(","));
              }
              arrayStr = `[${rowStrs.join(";")}]`;
            }
          } catch { /* ignore */ }
          return {
            id:         `dataset-${di.id}`,
            refId:      "",
            type:       "EQUATION" as BlockType,
            order:      -(datasetImports.length - idx) - fileImports.length - 1000,
            definition: { raw: `${di.localAlias} = ${arrayStr}`, displayEq: "" },
            _status:    "clean" as const,
          };
        }),
    [datasetImports, fileImports.length],
  );

  // Declared early so it can be passed to useSolver; populated by a fetch
  // effect defined after docMeta (which provides the function list).
  const [solverImportedFunctions, setSolverImportedFunctions] = useState<SolverImportedFunction[]>([]);

  // Seed cadParts from legacy importedCAD data at construction time so the
  // worker has them available on the first user-triggered solve (no solve fired here).
  const initialCadParts = useMemo<Record<string, import("@/solver/types").CadPart>>(() => {
    if (!document.importedCad?.length) return {};
    const parts: Record<string, import("@/solver/types").CadPart> = {};
    for (const entry of document.importedCad) {
      if (!entry.eqname || !entry.properties) continue;
      parts[entry.eqname] = { partId: entry.eqname, properties: entry.properties };
    }
    return parts;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Equation options for Card blocks ─────────────────────────────────────
  const equationOptions = useMemo<EquationOption[]>(
    () =>
      virtualBlocks
        .filter((b) => b._status !== "deleted" && b.type === "EQUATION")
        .sort((a, b) => a.order - b.order)
        .map((b) => ({
          id: b.id,
          variableName: ((b.definition.raw as string) ?? "").split("=")[0].trim() || b.id,
          order: b.order,
        })),
    [virtualBlocks],
  );

  // ── Solver ───────────────────────────────────────────────────────────────
  const solverBlocks = useMemo(
    () => buildSolverBlocks([...datasetSolverBlocks, ...importSolverBlocks, ...virtualBlocks]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [], // stable on mount; updated via handleRawChange / handleSliderChange / handleDefinitionChange
  );

  const { results: solverResults, solvingIds, solve } = useSolver(solverBlocks, solverImportedFunctions, initialCadParts);

  // Re-solve with updated cadParts when localImportedCad changes (e.g. after a refresh).
  // Skip the initial mount — initialCadParts already seeds the solver.
  const cadRefreshCount = useRef(0);
  useEffect(() => {
    if (cadRefreshCount.current === 0) { cadRefreshCount.current = 1; return; }
    const newCadParts: Record<string, import("@/solver/types").CadPart> = {};
    for (const entry of localImportedCad ?? []) {
      if (!entry.eqname || !entry.properties) continue;
      newCadParts[entry.eqname] = { partId: entry.eqname, properties: entry.properties };
    }
    const allBlocks = buildSolverBlocks([...datasetSolverBlocks, ...importSolverBlocks, ...virtualBlocks]);
    const eqBlocks = allBlocks.filter((b) => b.definition.raw).sort((a, b) => a.order - b.order);
    for (const b of eqBlocks) solve(allBlocks, b.id, newCadParts);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localImportedCad]);

  // Compute which variable names are stale (imported but out of date) and
  // propagate staleness through equations that depend on them.
  // Variables that have been freshly solved in this session are never stale.
  const staleVarNames = useMemo<Set<string>>(() => {
    const stale = new Set(
      fileImports.filter((fi) => fi.needsUpdate).map((fi) => fi.localAlias),
    );
    for (const block of virtualBlocks) {
      if (block.type !== "EQUATION") continue;
      const raw = (block.definition.raw as string) ?? "";
      const lhs = raw.split("=")[0].trim();
      const rhs = raw.split("=").slice(1).join("=");
      if ([...stale].some((v) => new RegExp(`\\b${v}\\b`, "i").test(rhs))) stale.add(lhs);
    }
    return stale;
  }, [fileImports, virtualBlocks]);

  // Sync solver in-flight state onto virtualBlocks so equation blocks can show a grey background.
  useEffect(() => {
    setVirtualBlocks((prev) => prev.map((b) => ({ ...b, _solving: solvingIds.has(b.id) })));
  }, [solvingIds]);

  // Merge live solver results with stored block solutions so plots (and other
  // consumers) can display data on page load without requiring a manual re-solve.
  const effectiveSolverResults = useMemo(() => {
    const map = new Map(solverResults);
    for (const b of virtualBlocks) {
      if (b._status === "deleted" || map.has(b.id)) continue;
      const sol = b.solution as { real?: Record<string, number>; size?: string; units?: string } | undefined;
      if (!sol?.real || !sol.size) continue;
      const raw = (b.definition as { raw?: string }).raw ?? "";
      const varName = raw.split(/\s*=\s*/)[0].trim().replace(/[^a-zA-Z0-9_]/g, "");
      if (!varName) continue;
      map.set(b.id, {
        blockId: b.id,
        order: b.order,
        variableName: varName,
        solution: {
          real: sol.real,
          imag: {},
          size: sol.size,
          units: sol.units ?? "",
          baseUnits: [0, 0, 0, 0, 0, 0, 0, 0],
          multiplier: 1,
          quantity: "",
        },
        display: { equation: "", solution: "", numericalModel: "", unitsModel: "", dimensionsModel: "", quantitiesModel: "" },
        errors: [],
      });
    }
    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solverResults, virtualBlocks]);

  // Re-solve all equations when file imports change so existing equations
  // immediately pick up newly imported variables.
  const isFirstImportRender = useRef(true);
  useEffect(() => {
    if (isFirstImportRender.current) { isFirstImportRender.current = false; return; }
    const allBlocks = buildSolverBlocks([...datasetSolverBlocks, ...importSolverBlocks, ...virtualBlocks]);
    const eqBlocks = allBlocks.filter((b) => b.type === "EQUATION" && b.definition.raw)
      .sort((a, b) => a.order - b.order);
    for (const b of eqBlocks) {
      solve(allBlocks, b.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importSolverBlocks]);

  // Re-solve all equations when imported function blocks load (or change) so
  // equations using function calls immediately get their results.
  // solverImportedFunctions fires twice during initial page load:
  //   1) on mount (initial [] state)
  //   2) when the async fetch completes (populated state)
  // Both must be skipped to satisfy the "no solve on page load" rule.
  const isFirstFunctionLoad = useRef(2);
  useEffect(() => {
    if (isFirstFunctionLoad.current > 0) { isFirstFunctionLoad.current--; return; }
    const allBlocks = buildSolverBlocks([...datasetSolverBlocks, ...importSolverBlocks, ...virtualBlocks]);
    const eqBlocks = allBlocks.filter((b) => b.type === "EQUATION" && b.definition.raw)
      .sort((a, b) => a.order - b.order);
    for (const b of eqBlocks) {
      solve(allBlocks, b.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solverImportedFunctions]);

  // Re-solve all equations when dataset imports change so existing equations
  // immediately pick up newly added dataset variables.
  const isFirstDatasetRender = useRef(true);
  useEffect(() => {
    if (isFirstDatasetRender.current) { isFirstDatasetRender.current = false; return; }
    const allBlocks = buildSolverBlocks([...datasetSolverBlocks, ...importSolverBlocks, ...virtualBlocks]);
    const eqBlocks = allBlocks.filter((b) => b.type === "EQUATION" && b.definition.raw)
      .sort((a, b) => a.order - b.order);
    for (const b of eqBlocks) {
      solve(allBlocks, b.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetSolverBlocks]);

  // Sync solver results back into virtualBlocks.solution and auto-persist
  useEffect(() => {
    if (solverResults.size === 0) return;
    setVirtualBlocks((prev: VirtualBlock[]) => {
      const next = prev.map((b): VirtualBlock => {
        if (b._status === "deleted") return b;
        const r = solverResults.get(b.id);
        if (!r) return b;
        if (r.errors.length > 0) {
          // Persist the error so it shows on next page load
          return { ...b, solution: { ...(b.solution ?? {}), errors: r.errors, display: undefined }, _status: b._status === "new" ? "new" : "modified" } as VirtualBlock;
        }
        if (!r.solution) return b;
        const lhs = r.display.equation ?? (b.definition as { displayEq?: string }).displayEq ?? "";
        const rhs = r.display.solution ?? "";
        const displayStr = rhs ? `${lhs} = ${rhs}` : lhs;
        return {
          ...b,
          solution: {
            real: r.solution.real,
            size: r.solution.size,
            units: r.solution.units,
            display: displayStr,
            errors: [],
          },
          _status: b._status === "new" ? "new" : "modified",
        } as VirtualBlock;
      });
      return next;
    });
  }, [solverResults]);


  // Legacy importedCAD cadParts are seeded into useSolver via initialCadParts at construction
  // time — no solve needed here.


  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // ── Document metadata (name, width, solver, toc, functionSettings) ──────────
  const [docMeta, setDocMeta] = useState({
    name:              document.name,
    width:             document.width ?? 825,
    solver:            (document.solver ?? "browser") as SolverLocation,
    toc:               document.toc ?? ({ show: false, maxLevel: 3 } as TocSettings),
    functionSettings:  document.functionSettings ?? ({ inputs: [], outputs: [] } as FunctionSettings),
    importedFunctions: (document.importedFunctions ?? []) as ImportedFunction[],
  });
  const [showProperties,       setShowProperties]       = useState(false);
  const [showToc,              setShowToc]              = useState(false);
  const [showFunction,         setShowFunction]         = useState(false);
  const [showImportedFunctions, setShowImportedFunctions] = useState(false);

  // Fetch equation blocks for each imported function so the solver can execute them.
  useEffect(() => {
    const fns = docMeta.importedFunctions;
    if (!fns || fns.length === 0) { setSolverImportedFunctions([]); return; }
    let cancelled = false;
    Promise.all(
      fns.map(async (fn) => {
        const res = await fetch(`/api/file/${fn.sourceFileId}/function-blocks`);
        if (!res.ok) return null;
        const data = await res.json() as { blocks: SolverImportedFunction["blocks"] };
        return {
          name:        fn.localAlias,
          fileId:      String(fn.sourceFileId),
          inputNames:  fn.inputs.map((p) => p.variableName),
          outputNames: fn.outputs.map((p) => p.variableName),
          blocks:      data.blocks,
        } as SolverImportedFunction;
      }),
    ).then((results) => {
      if (!cancelled) {
        setSolverImportedFunctions(results.filter((r): r is SolverImportedFunction => r !== null));
      }
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docMeta.importedFunctions]);

  // Single persist helper — always writes the full itemData blob so fields
  // from different modals don't clobber each other.
  const persistMeta = useCallback(
    async (next: typeof docMeta) => {
      setDocMeta(next);
      await fetch(`/api/file/${document.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:     next.name,
          itemData: JSON.stringify({
            width:             next.width,
            solver:            next.solver,
            toc:               next.toc,
            functionSettings:  next.functionSettings,
            importedFunctions: next.importedFunctions,
            ...(document.description !== undefined && { description: document.description }),
          }),
        }),
      });
    },
    [document.id],
  );

  const handleSaveProperties = useCallback(
    async (updates: { name: string; width: number; solver: SolverLocation }) => {
      await persistMeta({ ...docMeta, ...updates });
    },
    [docMeta, persistMeta],
  );

  const handleSaveToc = useCallback(
    async (toc: TocSettings) => {
      await persistMeta({ ...docMeta, toc });
    },
    [docMeta, persistMeta],
  );

  const handleSaveFunction = useCallback(
    async (functionSettings: FunctionSettings) => {
      await persistMeta({ ...docMeta, functionSettings });
    },
    [docMeta, persistMeta],
  );

  // Variables defined in this document — offered as suggestions in the function modal
  const availableVars = useMemo(() => {
    const vars: string[] = [];
    for (const b of virtualBlocks) {
      if (b._status === "deleted") continue;
      if (b.type === "EQUATION") {
        const raw = (b.definition.raw as string) ?? "";
        const match = raw.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
        if (match) vars.push(match[1]);
      } else if (["SLIDER", "DROPDOWN", "SELECT_BLOCK"].includes(b.type)) {
        const name = b.definition.variableName as string;
        if (name) vars.push(name);
      }
    }
    return [...new Set(vars)];
  }, [virtualBlocks]);

  // ── Block editing ────────────────────────────────────────────────────────
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [openSettingsId, setOpenSettingsId] = useState<string | null>(null);
  const [blockModelViews, setBlockModelViews] = useState<Record<string, ModelView>>({});
  const [htmlOverrides, setHtmlOverrides] = useState<Record<string, string>>({});

  // Single shared TipTap editor for all rich-text blocks
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false }),
    ],
    content: "",
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose prose-gray max-w-none focus:outline-none min-h-[1.5rem]",
      },
    },
  });

  const handleStartEditing = useCallback<StartEditingFn>(
    (id, html) => {
      if (!editor) return;
      editor.commands.setContent(html);
      editor.setEditable(true);
      setEditingBlockId(id);
      setTimeout(() => editor.commands.focus(), 0);
    },
    [editor],
  );

  const closeEditor = useCallback(
    (nextSelectedId: string | null = null) => {
      if (!editor || !editingBlockId) return;
      const html = editor.getHTML();
      setHtmlOverrides((prev) => ({ ...prev, [editingBlockId]: html }));
      // Mark block as modified
      setVirtualBlocks((prev) =>
        prev.map((b) =>
          b.id === editingBlockId
            ? { ...b, definition: { ...b.definition, text: html }, _status: b._status === "new" ? "new" : "modified" }
            : b,
        ),
      );
      editor.setEditable(false);
      setEditingBlockId(null);
      setSelectedBlockId(nextSelectedId);
    },
    [editor, editingBlockId],
  );

  const handleSave = useCallback<SaveFn>(() => {
    closeEditor(null);
  }, [closeEditor]);

  const handleSelect = useCallback<SelectBlockFn>(
    (id) => {
      if (editingBlockId) {
        closeEditor(id);
      } else {
        setSelectedBlockId(id);
      }
    },
    [editingBlockId, closeEditor],
  );

  // ── Equation raw string changes ──────────────────────────────────────────
  const handleRawChange = useCallback(
    (blockId: string, newRaw: string, newDisplayEq: string) => {
      // Update virtual DOM
      setVirtualBlocks((prev) =>
        prev.map((b) =>
          b.id === blockId
            ? {
                ...b,
                definition: { ...b.definition, raw: newRaw, displayEq: newDisplayEq },
                _status: b._status === "new" ? "new" : "modified",
              }
            : b,
        ),
      );
      // Re-run solver with updated block list (imports always prepended)
      const updatedBlocks = virtualBlocks.map((b) =>
        b.id === blockId
          ? { ...b, definition: { ...b.definition, raw: newRaw, displayEq: newDisplayEq } }
          : b,
      );
      solve(buildSolverBlocks([...datasetSolverBlocks, ...importSolverBlocks, ...updatedBlocks]), blockId);
    },
    [virtualBlocks, datasetSolverBlocks, importSolverBlocks, solve],
  );

  // ── Manual re-solve a single block ──────────────────────────────────────
  const handleResolve = useCallback(
    (blockId: string) => {
      solve(buildSolverBlocks([...datasetSolverBlocks, ...importSolverBlocks, ...virtualBlocks]), blockId);
    },
    [virtualBlocks, datasetSolverBlocks, importSolverBlocks, solve],
  );

  // ── Slider value change (all users can slide) ────────────────────────────
  const handleSliderChange = useCallback(
    (blockId: string, newValue: number) => {
      setVirtualBlocks((prev) =>
        prev.map((b) =>
          b.id === blockId
            ? { ...b, definition: { ...b.definition, value: newValue }, _status: b._status === "new" ? "new" : "modified" }
            : b,
        ),
      );
      const updatedBlocks = virtualBlocks.map((b) =>
        b.id === blockId ? { ...b, definition: { ...b.definition, value: newValue } } : b,
      );
      solve(buildSolverBlocks([...datasetSolverBlocks, ...importSolverBlocks, ...updatedBlocks]), blockId);
    },
    [virtualBlocks, datasetSolverBlocks, importSolverBlocks, solve],
  );

  // ── Input block definition change (slider config, dropdown selection, etc.) ──
  const handleDefinitionChange = useCallback(
    (blockId: string, newDef: Record<string, unknown>) => {
      setVirtualBlocks((prev) =>
        prev.map((b) =>
          b.id === blockId
            ? { ...b, definition: newDef, _status: b._status === "new" ? "new" : "modified" }
            : b,
        ),
      );
      const updatedBlocks = virtualBlocks.map((b) =>
        b.id === blockId ? { ...b, definition: newDef } : b,
      );
      const solverInput = buildSolverBlocks([...datasetSolverBlocks, ...importSolverBlocks, ...updatedBlocks]);
      const changedBlock = virtualBlocks.find((b) => b.id === blockId);
      if (changedBlock?.type === "FOR_LOOP") {
        // FOR_LOOP blocks aren't in the solver input directly — only their
        // synthetic start/end/step sub-blocks are. Trigger each one.
        solve(solverInput, `${blockId}:start`);
        solve(solverInput, `${blockId}:end`);
        solve(solverInput, `${blockId}:step`);
        // Also trigger any final-value synthetics from a previous Run.
        const forFinalValues = (newDef as Partial<ForLoopDef>).finalValues ?? {};
        for (const varName of Object.keys(forFinalValues)) {
          if (!varName.startsWith("_")) solve(solverInput, `${blockId}:final:${varName}`);
        }
      } else if (changedBlock?.type === "WHILE_LOOP") {
        // Trigger each synthetic final-value equation so downstream blocks update.
        const finalValues = (newDef as Partial<WhileLoopDef>).finalValues ?? {};
        for (const varName of Object.keys(finalValues)) {
          if (!varName.startsWith("_")) solve(solverInput, `${blockId}:final:${varName}`);
        }
      } else if (changedBlock?.type === "IF_ELSE") {
        // Trigger each synthetic final-value equation so downstream blocks update.
        const finalValues = (newDef as { finalValues?: Record<string, number> }).finalValues ?? {};
        for (const varName of Object.keys(finalValues)) {
          if (!varName.startsWith("_")) solve(solverInput, `${blockId}:final:${varName}`);
        }
      } else if (changedBlock && INPUT_BLOCK_TYPES.has(changedBlock.type as BlockType)) {
        solve(solverInput, blockId);
      } else if (changedBlock?.type === "EQUATION") {
        solve(solverInput, blockId);
      }
      // Other types (PLOT, CARD, IMAGE, VIDEO, etc.) don't participate in the solver.
    },
    [virtualBlocks, datasetSolverBlocks, importSolverBlocks, solve],
  );

  // ── Viewer-mode handlers (update state + re-solve, but no dirty marking) ──
  const handleViewerSliderChange = useCallback(
    (blockId: string, newValue: number) => {
      setVirtualBlocks((prev) =>
        prev.map((b) =>
          b.id === blockId ? { ...b, definition: { ...b.definition, value: newValue } } : b,
        ),
      );
      const updatedBlocks = virtualBlocks.map((b) =>
        b.id === blockId ? { ...b, definition: { ...b.definition, value: newValue } } : b,
      );
      solve(buildSolverBlocks([...datasetSolverBlocks, ...importSolverBlocks, ...updatedBlocks]), blockId);
    },
    [virtualBlocks, datasetSolverBlocks, importSolverBlocks, solve],
  );

  const handleViewerDefinitionChange = useCallback(
    (blockId: string, newDef: Record<string, unknown>) => {
      setVirtualBlocks((prev) =>
        prev.map((b) => (b.id === blockId ? { ...b, definition: newDef } : b)),
      );
      const changedBlock = virtualBlocks.find((b) => b.id === blockId);
      if (changedBlock && (INPUT_BLOCK_TYPES.has(changedBlock.type as BlockType) || changedBlock.type === "EQUATION")) {
        const updatedBlocks = virtualBlocks.map((b) =>
          b.id === blockId ? { ...b, definition: newDef } : b,
        );
        solve(buildSolverBlocks([...datasetSolverBlocks, ...importSolverBlocks, ...updatedBlocks]), blockId);
      }
    },
    [virtualBlocks, datasetSolverBlocks, importSolverBlocks, solve],
  );

  const handleViewerRawChange = useCallback(
    (blockId: string, newRaw: string, newDisplayEq: string) => {
      setVirtualBlocks((prev) =>
        prev.map((b) =>
          b.id === blockId
            ? { ...b, definition: { ...b.definition, raw: newRaw, displayEq: newDisplayEq } }
            : b,
        ),
      );
      const updatedBlocks = virtualBlocks.map((b) =>
        b.id === blockId
          ? { ...b, definition: { ...b.definition, raw: newRaw, displayEq: newDisplayEq } }
          : b,
      );
      solve(buildSolverBlocks([...datasetSolverBlocks, ...importSolverBlocks, ...updatedBlocks]), blockId);
    },
    [virtualBlocks, datasetSolverBlocks, importSolverBlocks, solve],
  );

  // ── Move block ───────────────────────────────────────────────────────────
  const handleMoveBlock = useCallback(
    (blockId: string, newIndex: number) => {
      const all = [...virtualBlocks]
        .filter((b) => b._status !== "deleted")
        .sort((a, b) => a.order - b.order);

      const currentIndex = all.findIndex((b) => b.id === blockId);
      if (currentIndex === -1 || newIndex === currentIndex) return;
      const clamped = Math.max(0, Math.min(all.length - 1, newIndex));

      const reordered = [...all];
      const [moved] = reordered.splice(currentIndex, 1);
      reordered.splice(clamped, 0, moved);

      const updates = new Map<string, number>();
      reordered.forEach((b, i) => {
        const o = i + 1;
        if (b.order !== o) updates.set(b.id, o);
      });
      if (updates.size === 0) return;

      setVirtualBlocks((prev) =>
        prev.map((b) =>
          updates.has(b.id)
            ? { ...b, order: updates.get(b.id)!, _status: b._status === "new" ? "new" : "modified" }
            : b,
        ),
      );
    },
    [virtualBlocks],
  );

  // ── Restore from version snapshot ────────────────────────────────────────
  const handleRestoreVersion = useCallback((restoredBlocks: import("@/types/document").Block[]) => {
    setVirtualBlocks(restoredBlocks.map((b) => ({ ...b, _status: "modified" as const })));
    setShowVersionHistory(false);
  }, []);

  // ── Delete block ─────────────────────────────────────────────────────────
  const handleDeleteBlock = useCallback(
    (blockId: string) => {
      setVirtualBlocks((prev) =>
        prev.map((b) =>
          b.id === blockId ? { ...b, _status: "deleted" as const } : b,
        ),
      );
      setSelectedBlockId((prev) => (prev === blockId ? null : prev));
    },
    [],
  );

  // ── Persist all dirty blocks to server ──────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "error" | null>(null);
  const saveStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  type CadPushNotif = { connId: number; cadType: string; phase: "pushing" | "pushed" | "error" | "reauth"; detail?: string };
  const [cadPushNotifs, setCadPushNotifs] = useState<CadPushNotif[]>([]);
  const cadPushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePersist = useCallback(async () => {
    if (saveInProgressRef.current) return;
    saveInProgressRef.current = true;
    setSaving(true);
    setSaveStatus(null);
    try {
      const dirty = virtualBlocks.filter((b) => b._status !== "clean");
      const refIdUpdates: Record<string, string> = {};

      await Promise.all(
        dirty.map(async (block) => {
          const content = JSON.stringify({ _v2: true, ...block.definition, ...(block.solution ? { solution: block.solution } : {}) });
          if (block._status === "new") {
            const res = await fetch("/api/component", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fileId: Number(document.id),
                componentTypeId: BLOCK_TYPE_TO_COMPONENT_ID[block.type] ?? 1,
                content,
                order: block.order,
              }),
            });
            if (res.ok) {
              const saved = await res.json();
              refIdUpdates[block.id] = String(saved.id ?? saved.refId ?? "");
            }
          } else if (block._status === "modified" && block.refId) {
            await fetch(`/api/component/${block.refId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ content, order: block.order }),
            });
          } else if (block._status === "deleted" && block.refId) {
            const delRes = await fetch(`/api/component/${block.refId}`, { method: "DELETE" });
            if (!delRes.ok) throw new Error(`Failed to delete block ${block.refId}: ${delRes.status}`);
          }
        }),
      );

      setVirtualBlocks((prev) =>
        prev
          .filter((b) => b._status !== "deleted")
          .map((b) => ({
            ...b,
            _status: "clean" as const,
            refId: refIdUpdates[b.id] ?? b.refId,
          })),
      );
      setSaveStatus("saved");

      // Clear this document's own stale flag, then mark its dependents stale.
      await fetch(`/api/file/${document.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ needsUpdate: false }),
      }).catch(() => {});

      // Build a lookup of all solved equation blocks (original-case keys).
      const allSolvedResults: Record<string, { value: number | string; units?: string }> = {};
      for (const block of virtualBlocks) {
        if (block._status === "deleted" || block.type !== "EQUATION") continue;
        const varName = ((block.definition.raw as string) ?? "").split("=")[0].trim();
        if (!varName) continue;
        const sol = block.solution as { real?: Record<string, number>; units?: string } | undefined;
        const scalar = sol?.real?.["0-0"];
        if (scalar === undefined) continue;
        allSolvedResults[varName] = { value: scalar, units: sol?.units };
      }

      if (dirty.length > 0) {
        fetch(`/api/file/${document.id}/mark-dependents-stale`, { method: "POST" }).catch(() => {});
      }

      // Build set of variable names from dirty equation blocks — only these changed.
      const dirtyVarNames = new Set<string>();
      for (const block of dirty) {
        if (block.type !== "EQUATION") continue;
        const varName = ((block.definition.raw as string) ?? "").split("=")[0].trim().toLowerCase();
        if (varName) dirtyVarNames.add(varName);
      }

      // Deduplicate connections by id, only keep those with an equations mapping.
      const seenIds = new Set<number>();
      const pushableConns = cadConnections.filter((conn) => {
        if (seenIds.has(conn.id)) return false;
        seenIds.add(conn.id);
        const eqs = conn.info.equations;
        return Array.isArray(eqs) && (eqs as unknown[]).length > 0;
      });

      if (pushableConns.length > 0) {
          if (cadPushTimerRef.current) clearTimeout(cadPushTimerRef.current);
          setCadPushNotifs(pushableConns.map((conn) => ({ connId: conn.id, cadType: conn.cadType, phase: "pushing" as const })));

          let completed = 0;
          pushableConns.forEach((conn) => {
            // Only send variables that are both mapped by this connection and were dirty (changed).
            const connEqs = (conn.info.equations as Array<{ varName: string }>) ?? [];
            const connResults: Record<string, { value: number | string; units?: string }> = {};
            for (const eq of connEqs) {
              if (!dirtyVarNames.has(eq.varName.toLowerCase())) continue;
              const key = Object.keys(allSolvedResults).find(
                (k) => k.toLowerCase() === eq.varName.toLowerCase(),
              );
              if (key) connResults[key] = allSolvedResults[key];
            }
            if (Object.keys(connResults).length === 0) return;
            fetch(`/api/cad-connection/${conn.id}/push`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ results: connResults }),
            })
              .then(async (res) => {
                const data = await res.json().catch(() => ({})) as { pushed?: number; error?: string };
                if (res.status === 401 && data.error === "reauth_required") {
                  setPushStatus((prev) => ({ ...prev, [conn.id]: { error: "reauth_required" } }));
                  setCadPushNotifs((prev) => prev.map((n) =>
                    n.connId === conn.id ? { ...n, phase: "reauth" as const } : n,
                  ));
                  return;
                }
                setPushStatus((prev) => ({
                  ...prev,
                  [conn.id]: res.ok ? { pushed: data.pushed ?? 0 } : { error: data.error ?? "Failed" },
                }));
                setCadPushNotifs((prev) => prev.map((n) =>
                  n.connId === conn.id
                    ? { ...n, phase: res.ok ? "pushed" : "error", detail: res.ok ? undefined : (data.error ?? "Failed") }
                    : n,
                ));
              })
              .catch(() => {
                setPushStatus((prev) => ({ ...prev, [conn.id]: { error: "Network error" } }));
                setCadPushNotifs((prev) => prev.map((n) =>
                  n.connId === conn.id ? { ...n, phase: "error", detail: "Network error" } : n,
                ));
              })
              .finally(() => {
                completed += 1;
                if (completed === pushableConns.length) {
                  cadPushTimerRef.current = setTimeout(
                    () => setCadPushNotifs((prev) => prev.filter((n) => n.phase === "reauth")),
                    4000,
                  );
                }
              });
          });
      }
    } catch {
      setSaveStatus("error");
    } finally {
      saveInProgressRef.current = false;
      setSaving(false);
      if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
      saveStatusTimerRef.current = setTimeout(() => setSaveStatus(null), 3000);
    }
  }, [virtualBlocks, document.id, cadConnections]);

  // ── Add block ────────────────────────────────────────────────────────────
  const handleAddBlock = useCallback(
    (type: BlockType) => {
      const sorted = [...virtualBlocks]
        .filter((b) => b._status !== "deleted")
        .sort((a, b) => a.order - b.order);

      const selIdx = selectedBlockId
        ? sorted.findIndex((b) => b.id === selectedBlockId)
        : sorted.length - 1;

      // New block gets the order immediately after the selected block
      const insertAfterOrder = sorted[selIdx]?.order ?? -1;
      const newOrder = insertAfterOrder + 1;

      // Shift all blocks at or after the new order up by 1
      const shifted = virtualBlocks.map((b) => {
        if (b._status === "deleted" || b.order < newOrder) return b;
        return {
          ...b,
          order: b.order + 1,
          _status: (b._status === "new" ? "new" : "modified") as VirtualBlock["_status"],
        };
      });

      const newBlock: VirtualBlock = {
        id: `new-${crypto.randomUUID()}`,
        refId: "",
        type,
        order: newOrder,
        definition: defaultDefinition(type),
        _status: "new",
      };

      setVirtualBlocks([...shifted, newBlock]);
      setSelectedBlockId(newBlock.id);
    },
    [virtualBlocks, selectedBlockId],
  );

  // ── Side-menu Add + Save ──────────────────────────────────────────────────
  const { setAddConfig, setSaveConfig, setDocConfig, setConnectConfig } = useSideMenuAdd();
  const handleAddBlockRef = useRef(handleAddBlock);
  useEffect(() => { handleAddBlockRef.current = handleAddBlock; }, [handleAddBlock]);

  useEffect(() => {
    if (!effectiveCanEdit) return;
    const DOC_ADD_ITEMS: (AddItem & { type: BlockType })[] = [
      { label: "Text",              icon: AlignLeft,         type: "TEXT" },
      { label: "Header",            icon: Heading,           type: "HEADER" },
      { label: "Equation",          icon: FunctionSquare,    type: "EQUATION" },
      { label: "Symbolic",          icon: Sigma,             type: "SYMBOLIC_EQUATION" },
      { label: "Slider",            icon: SlidersHorizontal, type: "SLIDER" },
      { label: "Select Block",      icon: ToggleLeft,        type: "SELECT_BLOCK" },
      { label: "Dropdown",          icon: ChevronDown,       type: "DROPDOWN" },
      { label: "For Loop",          icon: Repeat,            type: "FOR_LOOP" },
      { label: "If / Else",         icon: GitBranch,         type: "IF_ELSE" },
      { label: "While Loop",        icon: RefreshCw,         type: "WHILE_LOOP" },
      { label: "Plot",              icon: LineChart,         type: "PLOT" },
      { label: "Image",             icon: ImageIcon,         type: "IMAGE" },
      { label: "Video",             icon: Video,             type: "VIDEO" },
      { label: "Line Break",        icon: Minus,             type: "LINE_BREAK" },
      { label: "Card",              icon: CreditCard,        type: "CARD" },
    ];
    setAddConfig({
      items: DOC_ADD_ITEMS,
      onAdd: (label) => {
        const item = DOC_ADD_ITEMS.find((i) => i.label === label);
        if (item) handleAddBlockRef.current(item.type);
      },
    });
    return () => setAddConfig(null);
  }, [canEdit, setAddConfig]);

  // Register doc properties sub-cluster in side menu (no canEdit check)
  useEffect(() => {
    setDocConfig({
      items: [
        { label: "Properties", icon: Settings,   onAction: () => setShowProperties(true) },
        { label: "Hide/Show",  icon: Eye,         onAction: () => setShowHideShow(true) },
        { label: "Contents",   icon: List,        onAction: () => setShowToc(true) },
        { label: "CAD Link",   icon: LinkIcon,    onAction: () => setShowCadModal(true) },
        { label: "Biblio",     icon: BookMarked,  onAction: () => setShowBibliography(true) },
        { label: "Function",   icon: Code,        onAction: () => setShowFunction(true) },
        { label: "File Inputs",icon: LogIn,       onAction: () => setShowFileInputs(true) },
        { label: "Datasets",   icon: Database,    onAction: () => setShowDatasetInputs(true) },
        { label: "Imports",    icon: Package,     onAction: () => setShowImportedFunctions(true) },
        { label: "Dependents", icon: Network,     onAction: () => setShowDependentFiles(true) },
      ],
    });
    return () => setDocConfig(null);
  }, [setDocConfig]);

  // Register Connect hex → open CAD modal
  useEffect(() => {
    setConnectConfig({ onConnect: () => setShowCadModal(true) });
    return () => setConnectConfig(null);
  }, [setConnectConfig]);

  // Register save button in side menu
  const handlePersistRef = useRef(handlePersist);
  useEffect(() => { handlePersistRef.current = handlePersist; }, [handlePersist]);
  const saveInProgressRef = useRef(false);

  useEffect(() => {
    if (!effectiveCanEdit) return;
    setSaveConfig({ onSave: () => handlePersistRef.current(), saving });
    return () => setSaveConfig(null);
  }, [effectiveCanEdit, saving, setSaveConfig]);

  // ── Hide / Show ──────────────────────────────────────────────────────────
  const [hiddenTypes, setHiddenTypes] = useState<Set<BlockType>>(new Set());
  const [showHideShow, setShowHideShow] = useState(false);

  // ── Bibliography ──────────────────────────────────────────────────────────
  const [bibEntries, setBibEntries] = useState<BibEntry[]>(data.bibliographies as BibEntry[]);
  const [showBibliography, setShowBibliography] = useState(false);

  // ── Render ───────────────────────────────────────────────────────────────
  const ordered = useMemo(
    () =>
      [...virtualBlocks]
        .filter((b) => b._status !== "deleted" && !hiddenTypes.has(b.type) && b.name !== "systemCount")
        .sort((a, b) => a.order - b.order),
    [virtualBlocks, hiddenTypes],
  );

  return (
    <div className="flex w-full h-screen overflow-x-auto" style={{ paddingLeft: 400, paddingRight: 150, minWidth: 400 + docMeta.width + 150 }}>
      {/* CAD Connection modal */}
      {showCadModal && (
        <DocumentCadModal
          fileId={Number(document.id)}
          solverVariables={Array.from(
            new Set(
              [...solverResults.values()]
                .map((r) => r?.variableName)
                .filter((v): v is string => !!v),
            ),
          )}
          solverValues={(() => {
            const out: Record<string, { value: number | string; units?: string }> = {};
            solverResults.forEach((r) => {
              if (r?.variableName && r.solution?.real) {
                const scalar = r.solution.real["0-0"];
                if (scalar !== undefined) {
                  out[r.variableName.toLowerCase()] = { value: scalar, units: r.solution.units || undefined };
                }
              }
            });
            return out;
          })()}
          legacyImportedCad={localImportedCad}
          onClose={() => setShowCadModal(false)}
          onConnectionsChanged={(conns) => setCadConnections(conns as typeof cadConnections)}
          onDeleteLegacyEntry={effectiveCanEdit ? handleDeleteLegacyEntry : undefined}
          onRefreshCad={effectiveCanEdit ? handleRefreshCad : undefined}
          refreshingCad={refreshingCad}
          pushStatus={pushStatus}
          readOnly={!effectiveCanEdit}
        />
      )}

      {/* Imported Functions modal */}
      {showImportedFunctions && (
        <DocumentImportedFunctionsModal
          importedFunctions={docMeta.importedFunctions}
          onClose={() => setShowImportedFunctions(false)}
          onChanged={(fns) => persistMeta({ ...docMeta, importedFunctions: fns })}
          readOnly={!effectiveCanEdit}
        />
      )}

      {/* Dependent Files modal */}
      {showDependentFiles && (
        <DocumentDependentFilesModal
          fileId={Number(document.id)}
          onClose={() => setShowDependentFiles(false)}
        />
      )}

      {/* Dataset Inputs modal */}
      {showDatasetInputs && (
        <DocumentDatasetInputsModal
          fileId={Number(document.id)}
          entries={datasetImports}
          onClose={() => setShowDatasetInputs(false)}
          onChanged={setDatasetImports}
          readOnly={!effectiveCanEdit}
        />
      )}

      {/* File Inputs modal */}
      {showFileInputs && (
        <DocumentFileInputsModal
          fileId={Number(document.id)}
          entries={fileImports}
          solverResults={(() => {
            const m = new Map<string, SolvedImportResult | null>();
            fileImports.forEach((fi) => {
              const r = solverResults.get(`import-${fi.id}`);
              m.set(`import-${fi.id}`, r?.solution
                ? { size: r.solution.size, real: r.solution.real as Record<string, number>, units: r.solution.units }
                : null);
            });
            return m;
          })()}
          onClose={() => setShowFileInputs(false)}
          onChanged={setFileImports}
          readOnly={!effectiveCanEdit}
        />
      )}

      {/* Bibliography modal */}
      {showBibliography && (
        <DocumentBibliographyModal
          fileId={Number(document.id)}
          entries={bibEntries}
          onClose={() => setShowBibliography(false)}
          onChanged={setBibEntries}
          readOnly={!effectiveCanEdit}
        />
      )}

      {/* Properties modal */}
      {showProperties && (
        <DocumentPropertiesModal
          document={{ ...document, ...docMeta }}
          onClose={() => setShowProperties(false)}
          onSave={async (updates) => { await handleSaveProperties(updates); }}
          readOnly={!effectiveCanEdit}
        />
      )}

      {/* Hide / Show modal */}
      {showHideShow && (
        <DocumentHideShowModal
          hiddenTypes={hiddenTypes}
          onChange={setHiddenTypes}
          onClose={() => setShowHideShow(false)}
        />
      )}

      {/* Table of Contents modal */}
      {showToc && (
        <DocumentTocModal
          toc={docMeta.toc}
          onClose={() => setShowToc(false)}
          onSave={async (settings) => { await handleSaveToc(settings); }}
        />
      )}

      {/* File as a Function modal */}
      {showFunction && (
        <DocumentFunctionModal
          settings={docMeta.functionSettings}
          availableVars={availableVars}
          onClose={() => setShowFunction(false)}
          onSave={async (settings) => { await handleSaveFunction(settings); }}
          readOnly={!effectiveCanEdit}
        />
      )}

{/* Centering wrapper — no scroll, just positions the document column */}
      <div className="flex-1 min-w-0 flex justify-center">
        {/* White document column — this is the scroll container so the scrollbar sits on the white area */}
        <div ref={scrollContainerRef} className="overflow-y-auto bg-white px-5 pt-6 pb-10 relative z-[1] rounded-t-2xl mt-16" style={{ width: `${docMeta.width}px`, minWidth: `${docMeta.width}px`, height: "calc(100% - 4rem)" }}>
          <div className="mb-6 pb-4 border-b border-gray-200">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-3xl font-semibold text-gray-800 tracking-tight">{docMeta.name}</h1>
              {/* Checkout / lock controls */}
              <div className="flex items-center gap-2 mt-1 shrink-0">
                {canEdit && !lockInfo.lockedBy && (
                  <button
                    onClick={handleCheckout}
                    disabled={lockLoading}
                    className="flex items-center gap-1.5 rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <LockOpen size={12} />
                    Check Out
                  </button>
                )}
                {lockInfo.isLockedByMe && (
                  <>
                    <button
                      onClick={handleCheckin}
                      disabled={lockLoading}
                      className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Lock size={12} />
                      Check In
                    </button>
                    <button
                      onClick={handleDiscard}
                      disabled={lockLoading}
                      className="flex items-center gap-1.5 rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Discard
                    </button>
                  </>
                )}
                {lockInfo.lockedBy && !lockInfo.isLockedByMe && (
                  <span className="flex items-center gap-1.5 rounded border border-amber-300 bg-amber-50 px-3 py-1 text-xs text-amber-700">
                    <Lock size={12} />
                    Checked out by {lockInfo.lockedByName ?? "another user"}
                  </span>
                )}
                <button
                  onClick={() => setShowVersionHistory(true)}
                  title="Version history"
                  className="flex items-center gap-1.5 rounded border border-gray-300 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"
                >
                  <History size={12} />
                </button>
              </div>
            </div>
          </div>
          <DocumentTableOfContents
            blocks={virtualBlocks}
            toc={docMeta.toc}
            scrollContainerRef={scrollContainerRef}
          />
          {staleVarNames.size > 0 && (
            <div className="mx-4 mb-3 flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm text-orange-700">
              <AlertTriangle size={15} className="shrink-0" />
              Imported Items may have altered. Resolve the highlighted items.
            </div>
          )}
          <div className="grid grid-cols-12 gap-3 items-start">
            {ordered.map((block, blockIdx) =>
              renderBlock({
                block,
                canEdit: effectiveCanEdit,
                isSelected: selectedBlockId === block.id,
                isEditing: editingBlockId === block.id,
                sharedEditor: editingBlockId === block.id ? editor : null,
                onSelect: handleSelect,
                onStartEditing: handleStartEditing,
                onSave: handleSave,
                displayHtml: htmlOverrides[block.id],
                solverResults: effectiveSolverResults,
                onRawChange: effectiveCanEdit ? handleRawChange : undefined,
                onViewerRawChange: !effectiveCanEdit ? handleViewerRawChange : undefined,
                onSliderChange: effectiveCanEdit ? handleSliderChange : handleViewerSliderChange,
                onDefinitionChange: effectiveCanEdit ? handleDefinitionChange : handleViewerDefinitionChange,
                onDeleteBlock: effectiveCanEdit ? handleDeleteBlock : undefined,
                onResolve: handleResolve,
                equationOptions,
                onMoveBlock: handleMoveBlock,
                moveInfo: {
                  currentIndex: blockIdx,
                  total: ordered.length,
                  options: ordered.map((b, i) => ({
                    index: i,
                    label: `${i + 1} — ${getBlockLabel(b)}`,
                  })),
                },
                settingsOpenId: openSettingsId,
                onToggleSettings: (id) => setOpenSettingsId((prev) => (prev === id ? null : id)),
                modelView: blockModelViews[block.id],
                onModelViewChange: (id, view) => setBlockModelViews((prev) => ({ ...prev, [id]: view })),
                canUpload,
                staleVarNames,
              }),
            )}
          </div>
        </div>
      </div>

      {/* Version history panel */}
      {showVersionHistory && (
        <VersionHistoryPanel
          fileId={document.id}
          currentVersion={document.version ?? 1}
          onClose={() => setShowVersionHistory(false)}
          onRestore={handleRestoreVersion}
        />
      )}

      {/* Save + CAD push toasts */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end">
        {saveStatus && (
          <div className={[
            "flex items-center gap-2 px-6 py-3 rounded-lg shadow-lg text-base font-semibold",
            saveStatus === "saved" ? "bg-green-600 text-white" : "bg-red-600 text-white",
          ].join(" ")}>
            {saveStatus === "saved" ? "Saved" : "Save failed — check your connection"}
          </div>
        )}
        {cadPushNotifs.map((n) => {
          const platform = n.cadType === "fusion" ? "Fusion 360" : "Onshape";
          let label: string;
          let cls: string;
          if (n.phase === "pushing") {
            label = `Pushing to ${platform}…`;
            cls = "bg-blue-600 text-white";
          } else if (n.phase === "pushed") {
            label = `Pushed to ${platform}`;
            cls = "bg-green-600 text-white";
          } else if (n.phase === "reauth") {
            cls = "bg-yellow-600 text-white";
            return (
              <div key={n.connId} className={`flex items-center gap-3 px-6 py-3 rounded-lg shadow-lg text-base font-semibold ${cls}`}>
                {platform} session expired —{" "}
                <a href="/cadConnect" className="underline">Reconnect</a>
                <button onClick={() => setCadPushNotifs((prev) => prev.filter((x) => x.connId !== n.connId))} className="ml-2 opacity-70 hover:opacity-100">✕</button>
              </div>
            );
          } else {
            label = `${platform} push failed${n.detail ? `: ${n.detail}` : ""}`;
            cls = "bg-red-600 text-white";
          }
          return (
            <div key={n.connId} className={`flex items-center gap-2 px-6 py-3 rounded-lg shadow-lg text-base font-semibold ${cls}`}>
              {label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
