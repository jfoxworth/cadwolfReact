"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { solveDocumentOnce } from "@/utils/solveDocumentOnce";
import type { OrderedBlock } from "@/solver/types";
import PartTreeNav from "./PartTreeNav";
import PartTreeCadModal from "./PartTreeCadModal";
import type { PartTreePageData } from "@/types/part-tree";
import type { Item } from "@/types/item";

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

export default function PartTreeWrapper({ data, userId, canEdit }: Props) {
  const { partTree } = data;
  const [items, setItems] = useState<Item[]>(data.items);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [valueToSum, setValueToSum] = useState("");
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
  const [resolvingId, setResolvingId] = useState<string | null>(null);

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

  // Pre-compute needsUpdate status: documents use their own flag; folders/root
  // are true if ANY descendant document has needsUpdate === true.
  const needsUpdateMap = useMemo<Map<string, boolean>>(() => {
    const map = new Map<string, boolean>();
    function compute(item: Item): boolean {
      if (item.type === "DOCUMENT") {
        const v = item.needsUpdate ?? false;
        map.set(item.id, v);
        return v;
      }
      const children = childrenMap.get(item.id) ?? [];
      const any = children.some((child) => compute(child));
      map.set(item.id, any);
      return any;
    }
    compute(partTree);
    return map;
  }, [partTree, childrenMap]);

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

  async function handleRenameItem(itemId: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    await fetch(`/api/file/${itemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    setItems((prev) => prev.map((i) => i.id === itemId ? { ...i, name: trimmed } : i));
  }

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
            const content = JSON.stringify({ _v2: true, ...b.definition, solution: { display: r.display } });
            return fetch(`/api/component/${b.refId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ content }),
            });
          })
      );

      // Clear needsUpdate flag on the file
      await fetch(`/api/file/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ needsUpdate: false }),
      });

      setItems((prev) => prev.map((it) => it.id === item.id ? { ...it, needsUpdate: false } : it));
    } catch (err) {
      console.error("Resolve failed:", err);
    } finally {
      setResolvingId(null);
    }
  }, []);

  async function handleDeleteItem(itemId: string) {
    const res = await fetch(`/api/file/${itemId}`, { method: "DELETE" });
    if (!res.ok) return;
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
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      const name = valueToSumInput.trim();
      setValueToSum(name);
      if (name) {
        fetchEqValues(name);
      } else {
        setRawEqValues(new Map());
      }
    }
  }

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
            root={partTree}
            childrenMap={childrenMap}
            selectedId={selectedId}
            onSelect={setSelectedId}
            displayValues={displayValues}
            cadDisplayValues={cadDisplayValues}
            valueToSumLabel={valueToSum}
            needsUpdateMap={needsUpdateMap}
            onshapeConns={effectiveOnshapeConns}
            onQuantityChange={handleQuantityChange}
            onAddItem={handleAddItem}
            onRenameItem={handleRenameItem}
            onDeleteItem={handleDeleteItem}
            onLinkCad={setCadModalItemId}
            canEdit={canEdit}
            resolvingId={resolvingId}
            onResolve={handleResolve}
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
    </div>
  );
}
