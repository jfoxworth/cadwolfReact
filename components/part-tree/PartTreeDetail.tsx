"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import ItemIcon from "@/components/workspace/ItemIcon";
import type { Item } from "@/types/item";

interface RollupRow {
  documentId: number;
  documentName: string;
  name: string;
  expression: string;
  value: number | null;
  unit: string;
}

interface RollupResult {
  rows: RollupRow[];
  totals: Record<string, number>;
}

interface Props {
  root: Item;
  selected: Item | null;
  childrenMap: Map<string, Item[]>;
  allItems: Item[];
}

function ChildrenList({ items }: { items: Item[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-400 italic">No children.</p>;
  }
  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      {items.map((item, i) => (
        <a
          key={item.id}
          href={item.type === "DOCUMENT" ? `/document/${item.slug}` : `/part-tree/${item.slug}`}
          className={`flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-sm text-gray-800 ${
            i < items.length - 1 ? "border-b border-gray-100" : ""
          }`}
        >
          <ItemIcon type={item.type} />
          <span className="font-medium">{item.name}</span>
          {item.description && (
            <span className="text-gray-400 text-xs truncate ml-1">{item.description}</span>
          )}
        </a>
      ))}
    </div>
  );
}

function RollupPanel({ fileId }: { fileId: string }) {
  const [namesInput, setNamesInput] = useState("");
  const [result, setResult] = useState<RollupResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchRollup() {
    const names = namesInput.trim();
    if (!names) return;
    setLoading(true);
    const res = await fetch(`/api/file/${fileId}/rollup?names=${encodeURIComponent(names)}`);
    const data = await res.json() as RollupResult;
    setResult(data);
    setLoading(false);
  }

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        Equation Rollup
      </p>
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          placeholder="Equation names, e.g. weight, area, Fy"
          value={namesInput}
          onChange={(e) => setNamesInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchRollup()}
          className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={fetchRollup}
          disabled={loading || !namesInput.trim()}
          className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {loading ? "…" : "Fetch"}
        </button>
      </div>

      {result && (
        result.rows.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No matching equations found in descendant documents.</p>
        ) : (
          <div className="rounded-lg border border-gray-200 overflow-hidden text-sm">
            <div className="grid grid-cols-[1fr_140px_80px_60px] bg-gray-50 border-b px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <span>Document</span>
              <span>Equation</span>
              <span>Value</span>
              <span>Unit</span>
            </div>
            {result.rows.map((row, i) => (
              <div
                key={i}
                className={`grid grid-cols-[1fr_140px_80px_60px] items-center px-3 py-2 ${
                  i < result.rows.length - 1 ? "border-b border-gray-100" : ""
                }`}
              >
                <span className="text-gray-700 truncate">{row.documentName}</span>
                <span className="text-gray-600 font-mono text-xs truncate">{row.name}</span>
                <span className="text-gray-900">
                  {row.value !== null ? row.value.toPrecision(4) : <span className="text-gray-400 italic">–</span>}
                </span>
                <span className="text-gray-400">{row.unit}</span>
              </div>
            ))}
            {/* Totals */}
            {Object.keys(result.totals).length > 0 && (
              <div className="bg-gray-50 border-t px-3 py-2 flex gap-6">
                <span className="text-xs font-semibold text-gray-500 uppercase">Totals</span>
                {Object.entries(result.totals).map(([name, val]) => (
                  <span key={name} className="text-sm">
                    <span className="font-mono text-xs text-gray-600">{name}</span>
                    {" = "}
                    <span className="font-semibold">{Number(val.toPrecision(4))}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}

export default function PartTreeDetail({ root, selected, childrenMap, allItems }: Props) {
  // Nothing selected → show root description
  if (!selected || selected.id === root.id) {
    const rootChildren = childrenMap.get(root.id) ?? [];
    return (
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">{root.name}</h2>
          {root.description && <p className="text-gray-500 text-sm">{root.description}</p>}
          {!root.description && <p className="text-gray-400 text-sm italic">Select a node in the tree to view details.</p>}
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Top-level nodes</p>
          <ChildrenList items={rootChildren} />
        </div>
        <RollupPanel fileId={root.id} />
      </div>
    );
  }

  // Document selected
  if (selected.type === "DOCUMENT") {
    return (
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <ItemIcon type={selected.type} />
            <h2 className="text-xl font-bold text-gray-900">{selected.name}</h2>
          </div>
          {selected.description && <p className="text-gray-500 text-sm mt-1">{selected.description}</p>}
        </div>
        <a
          href={`/document/${selected.slug}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 transition-colors w-fit"
        >
          Open Document
          <ExternalLink size={14} />
        </a>
        <RollupPanel fileId={selected.id} />
      </div>
    );
  }

  // Folder selected
  const children = childrenMap.get(selected.id) ?? [];
  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <ItemIcon type={selected.type} />
          <h2 className="text-xl font-bold text-gray-900">{selected.name}</h2>
        </div>
        {selected.description && <p className="text-gray-500 text-sm mt-1">{selected.description}</p>}
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Contents</p>
        <ChildrenList items={children} />
      </div>
      <RollupPanel fileId={selected.id} />
    </div>
  );
}
