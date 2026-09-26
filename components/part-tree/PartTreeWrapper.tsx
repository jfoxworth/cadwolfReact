"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { solveDocumentOnce } from "@/utils/solveDocumentOnce";
import type { OrderedBlock } from "@/solver/types";
import PartTreeNav from "./PartTreeNav";
import PartTreeCadModal from "./PartTreeCadModal";
import PartTreeDescriptionModal from "./PartTreeDescriptionModal";
import type { PartTreePageData } from "@/types/part-tree";
import type { Item } from "@/types/item";
import { useChat, type BlockProposal } from "@/context/ChatContext";
import { buildPartTreePageContext, buildSelectedItemLocation, itemTypeLabel, importsClause, type ImportEdge } from "@/utils/partTreeToText";

interface OnshapeConnInfo {
  documentId: string;
  workspaceId: string;
  elementId?: string;
  elementName?: string;
  thumbnailUrl?: string;
}

interface Props {
  data: PartTreePageData;
  canEdit: boolean;
  canAdmin: boolean;
  userId: number;
}

interface EqValue {
  value: number | null;
  unit: string | null;
}

// Map CAD dropdown value key → property key and unit label
const CAD_VALUE_MAP: Record<string, { propKey: string; unit: string; divisor?: number }> = {
  mass_kg:   { propKey: "mass",    unit: "kg" },
  volume_m3: { propKey: "volume",  unit: "m³" },
  density:   { propKey: "density", unit: "kg/m³" },
  weight_n:  { propKey: "weight",  unit: "N" },
  weight_lbs:{ propKey: "weight",  unit: "lbs", divisor: 4.44822 },
};

// Recursively compute CAD display values for every item.
function computeCadDisplayValues(
  item: Item,
  childrenMap: Map<string, Item[]>,
  propKey: string,
  unit: string,
  divisor: number,
  out: Map<string, EqValue>,
  isRoot = false,
): EqValue {
  if (item.type === "DOCUMENT") {
    if (item.isAnalysis) {
      out.set(item.id, { value: null, unit: null });
      return { value: null, unit: null };
    }
    const cad = item.importedCad;
    if (!cad || cad.length === 0) {
      out.set(item.id, { value: null, unit: null });
      return { value: null, unit: null };
    }
    // Sum all CAD parts for this document
    let sum = 0;
    let hasAny = false;
    for (const part of cad) {
      const v = part.properties?.[propKey];
      if (v !== undefined && v !== null) {
        sum += v / divisor;
        hasAny = true;
      }
    }
    if (!hasAny) {
      out.set(item.id, { value: null, unit: null });
      return { value: null, unit: null };
    }
    const qty = item.quantity ?? 1;
    const result: EqValue = { value: sum * qty, unit };
    out.set(item.id, result);
    return result;
  }

  // Folder / assembly / root: sum children
  const children = childrenMap.get(item.id) ?? [];
  let sum = 0;
  let hasAny = false;
  for (const child of children) {
    const cv = computeCadDisplayValues(child, childrenMap, propKey, unit, divisor, out);
    if (cv.value !== null) {
      sum += cv.value;
      hasAny = true;
    }
  }

  const qty = (!isRoot && item.quantity != null) ? item.quantity : 1;
  const result: EqValue = hasAny ? { value: sum * qty, unit } : { value: null, unit: null };
  out.set(item.id, result);
  return result;
}

// Recursively compute display values for every item.
// Documents: rawValue * quantity (default qty=1).
// Folders/assemblies: sum of children * own quantity (default qty=1).
// Root (PART_TREE): sum of children only — no quantity multiplier.
function computeDisplayValues(
  item: Item,
  childrenMap: Map<string, Item[]>,
  rawValues: Map<string, EqValue>,
  out: Map<string, EqValue>,
  isRoot = false,
): EqValue {
  if (item.type === "DOCUMENT") {
    if (item.isAnalysis) {
      out.set(item.id, { value: null, unit: null });
      return { value: null, unit: null };
    }
    const raw = rawValues.get(item.id);
    if (!raw || raw.value === null) {
      out.set(item.id, { value: null, unit: null });
      return { value: null, unit: null };
    }
    const qty = item.quantity ?? 1;
    const result: EqValue = { value: raw.value * qty, unit: raw.unit };
    out.set(item.id, result);
    return result;
  }

  // Folder / assembly / root: sum children
  const children = childrenMap.get(item.id) ?? [];
  let sum = 0;
  let unit: string | null = null;
  let hasAny = false;
  for (const child of children) {
    const cv = computeDisplayValues(child, childrenMap, rawValues, out);
    if (cv.value !== null) {
      sum += cv.value;
      hasAny = true;
      if (unit === null) unit = cv.unit;
    }
  }

  // Apply own quantity to sub-assemblies (not the root)
  const qty = (!isRoot && item.quantity != null) ? item.quantity : 1;
  const result: EqValue = hasAny ? { value: sum * qty, unit } : { value: null, unit: null };
  out.set(item.id, result);
  return result;
}

export default function PartTreeWrapper({ data, userId, canEdit, canAdmin }: Props) {
  const { partTree } = data;
  const router = useRouter();
  const { mode, setPageContext, setSelectedBlock, registerProposalHandlers, setCanBuild } = useChat();
  const [items, setItems] = useState<Item[]>(data.items);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [valueToSum, setValueToSum] = useState("");
  const valueToSumRef = useRef("");
  const [valueToSumInput, setValueToSumInput] = useState("");
  const [cadValue, setCadValue] = useState("");
  const [rawEqValues, setRawEqValues] = useState<Map<string, EqValue>>(new Map());
  const [displayValues, setDisplayValues] = useState<Map<string, EqValue>>(new Map());

  const cadDisplayValues = useMemo<Map<string, EqValue>>(() => {
    if (!cadValue) return new Map();
    const cfg = CAD_VALUE_MAP[cadValue];
    if (!cfg) return new Map();
    const cmap = new Map<string, Item[]>();
    cmap.set(partTree.id, []);
    for (const item of items) {
      const pid = item.parentId ?? partTree.id;
      if (!cmap.has(pid)) cmap.set(pid, []);
      cmap.get(pid)!.push(item);
    }
    const out = new Map<string, EqValue>();
    computeCadDisplayValues(partTree, cmap, cfg.propKey, cfg.unit, cfg.divisor ?? 1, out, true);
    return out;
  }, [cadValue, items, partTree]);
  // Map from item ID → Onshape connection info used to build thumbnail URLs
  const [onshapeConns, setOnshapeConns] = useState<Map<string, OnshapeConnInfo>>(new Map());
  const [cadModalItemId, setCadModalItemId] = useState<string | null>(null);
  // Tracked separately from `partTree` (which comes straight from the `data` prop and is
  // otherwise never mutated locally in this component) so editing it updates the UI immediately
  // without needing to restructure every existing `partTree.*` usage elsewhere in this file.
  const [descriptionModalOpen, setDescriptionModalOpen] = useState(false);
  const [rootDescription, setRootDescription] = useState(partTree.description ?? "");
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [refreshingCadId, setRefreshingCadId] = useState<string | null>(null);

  // Refresh server data on mount so needsUpdate flags are current.
  useEffect(() => { router.refresh(); }, []);

  // Sync needsUpdate from fresh server props into items state after a refresh.
  useEffect(() => {
    setItems(prev =>
      prev.map(p => {
        const fresh = data.items.find(i => i.id === p.id);
        return fresh ? { ...p, needsUpdate: fresh.needsUpdate } : p;
      })
    );
  }, [data.items]);

  // Fetch Onshape CAD connections for all items in the tree.
  useEffect(() => {
    const docIds = [Number(partTree.id), ...data.items.map((i) => Number(i.id))];

    fetch("/api/cad-connection/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileIds: docIds }),
    })
      .then((r) => r.json())
      .then((conns: Array<{ fileId: number; cadType: string; info: OnshapeConnInfo; thumbnailUrl?: string }>) => {
        const map = new Map<string, OnshapeConnInfo>();
        for (const c of conns) {
          if (c.cadType === "onshape" && c.info.documentId && c.info.workspaceId) {
            if (!map.has(String(c.fileId))) {
              map.set(String(c.fileId), { ...c.info, thumbnailUrl: c.thumbnailUrl });
            }
          }
        }
        setOnshapeConns(map);
      })
      .catch(() => { /* ignore */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch declared cross-document variable imports (FileImport rows) for every item in the
  // tree, in one batched call — same template as the CAD-connections fetch above. Backs the AI
  // chat's page context (utils/partTreeToText.ts) so the model always knows which parts import
  // from which requirements documents, without needing a tool call just to see the wiring.
  const [importsByItemId, setImportsByItemId] = useState<Map<string, ImportEdge[]>>(new Map());
  useEffect(() => {
    const docIds = [Number(partTree.id), ...data.items.map((i) => Number(i.id))];

    fetch("/api/file-import/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileIds: docIds }),
    })
      .then((r) => r.json())
      .then((rows: Array<{ fileId: number; sourceFileId: number; sourceFileName: string; sourceVariableName: string; localAlias: string }>) => {
        const map = new Map<string, ImportEdge[]>();
        for (const row of rows) {
          const key = String(row.fileId);
          const edge: ImportEdge = {
            localAlias: row.localAlias,
            sourceVariableName: row.sourceVariableName,
            sourceFileName: row.sourceFileName,
            sourceFileId: row.sourceFileId,
          };
          if (!map.has(key)) map.set(key, []);
          map.get(key)!.push(edge);
        }
        setImportsByItemId(map);
      })
      .catch(() => { /* ignore */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const childrenMap = useMemo(() => {
    const map = new Map<string, Item[]>();
    map.set(partTree.id, []);
    for (const item of items) {
      const pid = item.parentId ?? partTree.id;
      if (!map.has(pid)) map.set(pid, []);
      map.get(pid)!.push(item);
    }
    return map;
  }, [partTree, items]);

  // Part trees have no "checked out" concept (unlike Document) — Build mode is simply gated on
  // edit access, same reasoning as Workspace/Dataset.
  useEffect(() => { setCanBuild(canEdit); }, [canEdit, setCanBuild]);

  // Overview is talk-only about the tree as a whole — a lingering selection from Inspect/Build
  // would otherwise leak into Overview's context and responses. Same reasoning/pattern as
  // documentWrapper.tsx's equivalent effect.
  useEffect(() => { if (mode === "overview") setSelectedId(null); }, [mode]);

  // AI chat page-context dump — rebuilt whenever items/rollup values change so the assistant
  // always sees current quantities/rollups, not a stale snapshot.
  useEffect(() => {
    const result = buildPartTreePageContext(partTree, childrenMap, displayValues, cadDisplayValues, valueToSum, cadValue, importsByItemId);
    setPageContext(result.text);
    return () => setPageContext(null);
  }, [partTree, childrenMap, displayValues, cadDisplayValues, valueToSum, cadValue, importsByItemId, setPageContext]);

  // Selected-item chip — mirrors documentWrapper's selected-block effect. Handles both a child
  // item and the root itself (selecting the root shows "Part Tree Root" with no location).
  useEffect(() => {
    if (!selectedId) { setSelectedBlock(null); return; }
    const item = selectedId === partTree.id ? partTree : items.find((i) => i.id === selectedId);
    if (!item) { setSelectedBlock(null); return; }
    const isRoot = selectedId === partTree.id;
    const location = isRoot ? "Top of part tree" : buildSelectedItemLocation(selectedId, items, partTree);
    const dv = displayValues.get(item.id);
    const cv = cadDisplayValues.get(item.id);
    const contextLine = [
      `${isRoot ? "Part Tree" : itemTypeLabel(item)}: ${item.name} (id ${item.id})`,
      item.quantity != null ? `qty ${item.quantity}` : null,
      valueToSum && dv?.value != null ? `${valueToSum}: ${dv.value}${dv.unit ? ` ${dv.unit}` : ""}` : null,
      cadValue && cv?.value != null ? `${cadValue}: ${cv.value}${cv.unit ? ` ${cv.unit}` : ""}` : null,
      importsClause(item, importsByItemId),
    ].filter(Boolean).join(", ");
    setSelectedBlock(
      {
        id: item.id,
        type: isRoot ? "Part Tree Root" : itemTypeLabel(item),
        name: item.name,
        location,
        contextLine,
        detail: contextLine,
        // Part trees have no natural linear order (it's a tree, not a sequence) — these are
        // only ever rendered in Document's own Inspect-panel position/total display, which
        // part-tree's simpler item chip doesn't use.
        position: 0,
        total: 0,
      },
      () => setSelectedId(null),
    );
  }, [selectedId, items, partTree, displayValues, cadDisplayValues, valueToSum, cadValue, importsByItemId, setSelectedBlock]);
  // Workspace items with no own connection show a thumbnail from their first
  // direct child that has a connection (one level only — matching old system).
  const effectiveOnshapeConns = useMemo(() => {
    const effective = new Map(onshapeConns);
    for (const item of items) {
      if (item.type !== "DOCUMENT" && !effective.has(item.id)) {
        const directConn = (childrenMap.get(item.id) ?? [])
          .map((child) => onshapeConns.get(child.id))
          .find(Boolean);
        if (directConn) effective.set(item.id, directConn);
      }
    }
    return effective;
  }, [onshapeConns, childrenMap, items]);

  function recomputeDisplayValues(currentItems: Item[], currentRawEqValues: Map<string, EqValue>) {
    const cmap = new Map<string, Item[]>();
    cmap.set(partTree.id, []);
    for (const item of currentItems) {
      const pid = item.parentId ?? partTree.id;
      if (!cmap.has(pid)) cmap.set(pid, []);
      cmap.get(pid)!.push(item);
    }
    const out = new Map<string, EqValue>();
    computeDisplayValues(partTree, cmap, currentRawEqValues, out, true);
    setDisplayValues(out);
  }


  async function fetchEqValues(equationName: string) {
    const docIds = items
      .filter((i) => i.type === "DOCUMENT")
      .map((i) => parseInt(i.id, 10));
    if (docIds.length === 0) return;

    const res = await fetch("/api/part-tree/equation-values", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileIds: docIds, variableName: equationName }),
    });
    if (!res.ok) return;

    const responseData: { fileId: number; value: number | null; unit: string | null }[] =
      await res.json();

    const map = new Map<string, EqValue>();
    for (const row of responseData) {
      map.set(String(row.fileId), { value: row.value, unit: row.unit });
    }
    setRawEqValues(map);
    recomputeDisplayValues(items, map);
  }

  function handleQuantityChange(itemId: string, quantity: number | null) {
    const newItems = items.map((i) =>
      i.id === itemId ? { ...i, quantity: quantity ?? undefined } : i
    );
    setItems(newItems);
    recomputeDisplayValues(newItems, rawEqValues);
  }

  async function handleAddItem(parentId: string, fileTypeId: string) {
    const name = fileTypeId === "Document" ? "New Part" : "New Subsystem";
    const res = await fetch("/api/file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileTypeId, name, parentId: Number(parentId), userId }),
    });
    if (!res.ok) return;
    const newItem: Item = await res.json();
    setItems((prev) => [...prev, newItem]);
  }

  async function handleRenameItem(itemId: string, name: string): Promise<boolean> {
    const trimmed = name.trim();
    if (!trimmed) return false;
    const res = await fetch(`/api/file/${itemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    if (!res.ok) return false;
    setItems((prev) => prev.map((i) => i.id === itemId ? { ...i, name: trimmed } : i));
    return true;
  }

  async function handleMoveItem(itemId: string, destinationId: string): Promise<boolean> {
    const res = await fetch(`/api/file/${itemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentId: Number(destinationId) }),
    });
    if (!res.ok) return false;
    setItems((prev) => prev.map((i) => i.id === itemId ? { ...i, parentId: destinationId } : i));
    return true;
  }

  // Chat-facing create — takes an explicit name and the requirements-document flag, unlike
  // handleAddItem (used by the tree's own "+" UI), which always picks a default name and never
  // creates a requirements document directly.
  async function createFileFromChat(parentId: string, fileTypeId: string, name?: string, isRequirementsDocument?: boolean): Promise<Item | undefined> {
    const defaultName = fileTypeId === "Document" ? "New Part" : "New Subsystem";
    const res = await fetch("/api/file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileTypeId, name: name?.trim() || defaultName, parentId: Number(parentId), userId }),
    });
    if (!res.ok) return undefined;
    let newItem: Item = await res.json();
    if (fileTypeId === "Document" && isRequirementsDocument) {
      const patchRes = await fetch(`/api/file/${newItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAnalysis: true }),
      });
      if (patchRes.ok) newItem = { ...newItem, isAnalysis: true };
    }
    setItems((prev) => [...prev, newItem]);
    return newItem;
  }

  const handleRefreshCad = useCallback(async (item: Item) => {
    setRefreshingCadId(item.id);
    try {
      const res = await fetch(`/api/file/${item.id}/refresh-cad-properties`, { method: "POST" });
      if (!res.ok) return;
      const data = await res.json() as {
        importedCad: Array<{ eqname: string; partName?: string; properties?: Record<string, number> }>;
        importedCadFetchedAt: string;
      };
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, importedCad: data.importedCad, importedCadFetchedAt: data.importedCadFetchedAt }
            : i,
        ),
      );
    } finally {
      setRefreshingCadId(null);
    }
  }, []);

  const handleResolve = useCallback(async (item: Item) => {
    setResolvingId(item.id);
    try {
      const res = await fetch(`/api/file/${item.id}/solve-data`);
      if (!res.ok) return;
      const { blocks, fileImports } = await res.json();

      // Synthetic blocks for imported variables (same pattern as documentWrapper importSolverBlocks)
      const importBlocks: OrderedBlock[] = (fileImports as Array<{ id: number; localAlias: string; value: string | null; units: string | null }>)
        .filter((fi) => fi.value != null)
        .map((fi, i) => ({
          id: `import-${fi.id}`,
          order: -1000 + i,
          type: "EQUATION" as const,
          definition: { raw: `${fi.localAlias} = ${fi.value}${fi.units ? " " + fi.units : ""}` },
        }));

      // Capture pre-solve scalar and size for each block (already in DB) before solving.
      const preSolve = new Map<string, { scalar: number; size: unknown }>();
      for (const b of blocks as Array<{ definition?: Record<string, unknown>; solution?: { real?: Record<string, number>; size?: unknown } }>) {
        const varName = ((b.definition?.raw as string) ?? "").split("=")[0].trim().toLowerCase();
        if (!varName) continue;
        const scalar = b.solution?.real?.["0-0"];
        if (scalar !== undefined) preSolve.set(varName, { scalar, size: b.solution?.size });
      }

      const solverBlocks: OrderedBlock[] = [
        ...importBlocks,
        ...blocks
          .filter((b: { type: string }) => ["EQUATION", "SLIDER", "DROPDOWN"].includes(b.type))
          .map((b: { id: string; order: number; type: string; definition: Record<string, unknown> }) => ({
            id: b.id, order: b.order, type: b.type, definition: b.definition,
          })),
      ];

      const results = await solveDocumentOnce(solverBlocks);
      const resultMap = new Map(results.map((r) => [r.blockId, r]));

      // Persist solved solutions
      await Promise.all(
        blocks
          .filter((b: { id: string; refId?: string }) => resultMap.has(b.id) && b.refId)
          .map((b: { id: string; refId: string; definition: Record<string, unknown> }) => {
            const r = resultMap.get(b.id)!;
            const lhs = r.display.equation ?? "";
            const rhs = r.display.solution ?? "";
            const displayStr = rhs ? `${lhs} = ${rhs}` : lhs;
            const content = JSON.stringify({
              _v2: true,
              ...b.definition,
              solution: {
                display: displayStr,
                real: r.solution?.real,
                size: r.solution?.size,
                units: r.solution?.units,
                errors: [],
              },
            });
            return fetch(`/api/component/${b.refId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ content }),
            });
          })
      );

      // Clear needsUpdate flag on the file and its import stale flags
      await fetch(`/api/file/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ needsUpdate: false, clearImportNeedsUpdate: true }),
      });

      setItems((prev) => prev.map((it) => it.id === item.id ? { ...it, needsUpdate: false } : it));

      // Push only changed values to connected CAD models.
      // Compare fresh solve result against pre-solve stored value — only include if different.
      const allSolvedResults: Record<string, { value: number | string; units?: string }> = {};
      for (const r of results) {
        if (!r.variableName || !r.solution) continue;
        const scalar = (r.solution.real as Record<string, number>)["0-0"];
        if (scalar === undefined) continue;
        const prior = preSolve.get(r.variableName.toLowerCase());
        if (prior && prior.scalar === scalar && prior.size === r.solution.size) continue;
        allSolvedResults[r.variableName] = { value: scalar, units: r.solution.units };
      }

      if (Object.keys(allSolvedResults).length > 0) {
        const connsRes = await fetch(`/api/cad-connection?fileId=${item.id}`);
        if (connsRes.ok) {
          const connections = await connsRes.json() as Array<{ id: number; cadType: string; info: { equations?: Array<{ varName: string }> } }>;
          for (const conn of connections) {
            const eqs = conn.info.equations ?? [];
            if (eqs.length === 0) continue;
            const connResults: Record<string, { value: number | string; units?: string }> = {};
            for (const eq of eqs) {
              const key = Object.keys(allSolvedResults).find(k => k.toLowerCase() === eq.varName.toLowerCase());
              if (key) connResults[key] = allSolvedResults[key];
            }
            fetch(`/api/cad-connection/${conn.id}/push`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ results: connResults }),
            }).catch(() => {});
          }
        }
      }
      // Refresh "Value to sum" display with fresh DB values after solve.
      if (valueToSumRef.current) fetchEqValues(valueToSumRef.current);
    } catch (err) {
      console.error("Resolve failed:", err);
    } finally {
      setResolvingId(null);
    }
  }, []);

  async function handleToggleAnalysis(itemId: string, isAnalysis: boolean) {
    await fetch(`/api/file/${itemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAnalysis }),
    });
    setItems((prev) => prev.map((i) => i.id === itemId ? { ...i, isAnalysis } : i));
  }

  async function handleDeleteItem(itemId: string): Promise<boolean> {
    const res = await fetch(`/api/file/${itemId}`, { method: "DELETE" });
    if (!res.ok) return false;
    // Remove the deleted item and all its descendants from local state
    const toRemove = new Set<string>([itemId]);
    const queue = [itemId];
    while (queue.length) {
      const next = queue.shift()!;
      for (const child of childrenMap.get(next) ?? []) {
        toRemove.add(child.id);
        queue.push(child.id);
      }
    }
    setItems((prev) => prev.filter((i) => !toRemove.has(i.id)));
    return true;
  }

  // AI chat's Build-mode proposals — Workspace-style pending approval (not Document's
  // auto-apply-batch pattern), since creating/renaming/moving/deleting a real File row has no
  // local-draft staging layer the way document block edits do. Every id is validated against the
  // current items/root before touching the network — never trust a proposal's id blindly.
  useEffect(() => {
    registerProposalHandlers({
      onPropose: () => {},
      onApprove: async (proposal: BlockProposal) => {
        if (proposal.tool === "create_file") {
          const { fileTypeId, name, parentId, isRequirementsDocument } = proposal.input as {
            fileTypeId: string; name?: string; parentId?: string; isRequirementsDocument?: boolean;
          };
          if (fileTypeId !== "Document" && fileTypeId !== "Workspace") {
            throw new Error(`Can't create a file of type "${fileTypeId}" this way.`);
          }
          const targetParentId = parentId ?? partTree.id;
          const validParent = targetParentId === partTree.id || items.some((i) => i.id === targetParentId && i.type === "WORKSPACE");
          if (!validParent) throw new Error("The parent must be a subsystem (or the part tree root) from the current tree.");
          const created = await createFileFromChat(targetParentId, fileTypeId, name, isRequirementsDocument);
          if (!created) throw new Error("Couldn't create the item — check you have edit access there.");
        } else if (proposal.tool === "rename_file") {
          const { targetId, name } = proposal.input as { targetId: string; name: string };
          if (targetId !== partTree.id && !items.some((i) => i.id === targetId)) {
            throw new Error("That item isn't in the current part tree.");
          }
          if (!(await handleRenameItem(targetId, name))) throw new Error("Couldn't rename — check you have edit access.");
        } else if (proposal.tool === "move_file") {
          const { targetId, destinationId } = proposal.input as { targetId: string; destinationId: string };
          if (!items.some((i) => i.id === targetId)) throw new Error("That item isn't in the current part tree.");
          const destOk = destinationId === partTree.id || items.some((i) => i.id === destinationId && i.type === "WORKSPACE");
          if (!destOk) throw new Error("The destination must be a subsystem, or the part tree root, from the current tree.");
          if (!(await handleMoveItem(targetId, destinationId))) throw new Error("Couldn't move — check you have edit access on both ends.");
        } else if (proposal.tool === "delete_file") {
          const { targetId } = proposal.input as { targetId: string };
          if (targetId === partTree.id) throw new Error("Can't delete the part tree itself this way.");
          if (!items.some((i) => i.id === targetId)) throw new Error("That item isn't in the current part tree.");
          if (!canAdmin) throw new Error("Deleting requires admin permission on this part tree.");
          if (!(await handleDeleteItem(targetId))) throw new Error("Couldn't delete — this requires admin permission.");
        }
      },
      onReject: () => {},
    });
    return () => registerProposalHandlers(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerProposalHandlers, items, partTree, canAdmin]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      const name = valueToSumInput.trim();
      setValueToSum(name);
      valueToSumRef.current = name;
      if (name) {
        fetchEqValues(name);
      } else {
        setRawEqValues(new Map());
      }
    }
  }

  // Overlays the locally-edited description onto the otherwise-static `partTree` prop, so
  // PartTreeNav's root row reflects an edit immediately without a page reload.
  const rootForDisplay: Item = { ...partTree, description: rootDescription };

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden" style={{ paddingLeft: "350px", paddingRight: "150px", paddingTop: "100px", paddingBottom: "100px" }}>
      <div className="flex-1 flex flex-col bg-white" style={{ zIndex: 1, position: "relative" }}>

        {/* Sticky header row */}
        <div className="flex items-center gap-2 px-5 py-2 border-b-2 border-gray-300 shrink-0 text-sm text-gray-500">
          <div className="flex-1" />

          {/* Value to Sum column header */}
          <div className="flex flex-col items-center" style={{ width: "9rem" }}>
            <label className="font-medium text-gray-600 mb-0.5">Value to Sum</label>
            <input
              type="text"
              placeholder="equation name…"
              value={valueToSumInput}
              onChange={(e) => setValueToSumInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full text-sm border border-gray-300 rounded px-2 py-0.5 focus:outline-none focus:border-blue-400"
            />
          </div>

          {/* CAD Value column header */}
          <div className="flex flex-col items-center" style={{ width: "8rem" }}>
            <label className="font-medium text-gray-600 mb-0.5">CAD Value</label>
            <select
              value={cadValue}
              onChange={(e) => setCadValue(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:border-blue-400"
            >
              <option value="">None</option>
              <option value="mass_kg">Mass (kg)</option>
              <option value="volume_m3">Volume (m³)</option>
              <option value="density">Density</option>
              <option value="material">Material</option>
              <option value="weight_n">Weight (N)</option>
              <option value="weight_lbs">Weight (lbs)</option>
            </select>
          </div>

          {/* Spacer matching qty input + status icon + ellipsis widths */}
          <div className="shrink-0" style={{ width: "calc(4rem + 14px + 1.5rem + 0.5rem)" }} />
        </div>

        {/* Scrollable tree */}
        <div className="flex-1 overflow-y-auto" style={{ padding: "20px", paddingTop: "0" }}>
          <PartTreeNav
            root={rootForDisplay}
            childrenMap={childrenMap}
            selectedId={selectedId}
            onSelect={setSelectedId}
            displayValues={displayValues}
            cadDisplayValues={cadDisplayValues}
            valueToSumLabel={valueToSum}
            anyStale={items.some(i => i.needsUpdate ?? false)}
            onshapeConns={effectiveOnshapeConns}
            onQuantityChange={handleQuantityChange}
            onAddItem={handleAddItem}
            onRenameItem={handleRenameItem}
            onDeleteItem={handleDeleteItem}
            onLinkCad={setCadModalItemId}
            onToggleAnalysis={handleToggleAnalysis}
            onEditDescription={() => setDescriptionModalOpen(true)}
            canEdit={canEdit}
            resolvingId={resolvingId}
            onResolve={handleResolve}
            refreshingCadId={refreshingCadId}
            onRefreshCad={handleRefreshCad}
          />
        </div>

      </div>

      {cadModalItemId && (
        <PartTreeCadModal
          itemId={cadModalItemId}
          itemName={items.find((i) => i.id === cadModalItemId)?.name ?? partTree.name}
          onClose={() => setCadModalItemId(null)}
          onSaved={(itemId, conn) => {
            setOnshapeConns((prev) => new Map(prev).set(itemId, conn));
          }}
        />
      )}

      {descriptionModalOpen && (
        <PartTreeDescriptionModal
          partTreeId={partTree.id}
          initialDescription={rootDescription}
          onClose={() => setDescriptionModalOpen(false)}
          onSaved={setRootDescription}
        />
      )}
    </div>
  );
}
