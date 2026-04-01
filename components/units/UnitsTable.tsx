"use client";

import { useState, useMemo } from "react";
import type { Unit } from "@/types/unit";

function formatFactor(value: number | null): string {
  if (value === null) return "formula";
  if (Math.abs(value) >= 1e9 || (Math.abs(value) < 1e-4 && value !== 0)) {
    return value.toExponential(4);
  }
  return parseFloat(value.toPrecision(7)).toString();
}

export default function UnitsTable({ units }: { units: Unit[] }) {
  const quantities = useMemo(() => {
    const set = new Set(units.map((u) => u.quantity));
    return ["All", ...Array.from(set).sort()];
  }, [units]);

  const [selected, setSelected] = useState("All");

  const filtered = useMemo(
    () => (selected === "All" ? units : units.filter((u) => u.quantity === selected)),
    [units, selected]
  );

  return (
    <div>
      {/* Filter */}
      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm font-medium text-gray-600">Filter by quantity:</label>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="text-sm border border-gray-200 rounded-md px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {quantities.map((q) => (
            <option key={q} value={q}>{q}</option>
          ))}
        </select>
        <span className="text-sm text-gray-400">{filtered.length} units</span>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-[100px_1fr_120px_140px_140px_80px] bg-gray-50 border-b border-gray-200 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <span>Unit</span>
          <span>Name</span>
          <span>Conv. Unit</span>
          <span>Conv. Factor</span>
          <span>Quantity</span>
          <span>Class</span>
        </div>

        <div className="divide-y divide-gray-100">
          {filtered.map((u) => (
            <div
              key={`${u.unit}-${u.quantity}`}
              className="grid grid-cols-[100px_1fr_120px_140px_140px_80px] items-center px-4 py-2.5 text-sm hover:bg-gray-50"
            >
              <span className="font-mono font-medium text-gray-800">{u.unit}</span>
              <span className="text-gray-600">{u.name}</span>
              <span className="font-mono text-gray-500">{u.conversionUnit}</span>
              <span className="font-mono text-gray-500">{formatFactor(u.conversionFactor)}</span>
              <span className="text-gray-500">{u.quantity}</span>
              <span className="text-gray-400">{u.class}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
