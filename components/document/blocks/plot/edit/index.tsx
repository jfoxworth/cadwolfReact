"use client";

import { useState, useCallback } from "react";
import type { PlotDefinition, PlotType } from "../types";
import { COLOR_SCHEME_OPTIONS, resolveColors } from "../colorSchemes";
import LineEdit from "../line/edit";
import AreaEdit from "../area/edit";
import PieEdit from "../pie/edit";
import DonutEdit from "../donut/edit";
import HeatmapEdit from "../heatmap/edit";
import BubbleEdit from "../bubble/edit";
import ScatterEdit from "../scatter/edit";
import BarEdit from "../bar/edit";
import ComboEdit from "../combo/edit";
import SurfaceEdit from "../surface/edit";

const PLOT_TYPE_OPTIONS: { value: PlotType; label: string }[] = [
  { value: "line",    label: "Line chart" },
  { value: "area",    label: "Area chart" },
  { value: "scatter", label: "Scatter chart" },
  { value: "bar",     label: "Bar chart" },
  { value: "combo",   label: "Combo (bar + line + scatter)" },
  { value: "pie",     label: "Pie chart" },
  { value: "donut",   label: "Donut chart" },
  { value: "heatmap", label: "Heatmap" },
  { value: "surface", label: "3D Surface" },
  { value: "bubble",  label: "Bubble chart" },
];

interface EditModalProps {
  initial: PlotDefinition;
  varNames: string[];
  onSave: (def: PlotDefinition) => void;
  onCancel: () => void;
}

export default function PlotEditModal({ initial, varNames, onSave, onCancel }: EditModalProps) {
  const [draft, setDraft] = useState<PlotDefinition>(() => ({
    plotType: "line",
    title: "",
    showLegend: true,
    height: 400,
    colorScheme: "default",
    ...initial,
  }));

  const patch = useCallback((p: Partial<PlotDefinition>) => setDraft((d) => ({ ...d, ...p })), []);

  const handleTypeChange = (newType: PlotType) => {
    setDraft((d) => ({ ...d, plotType: newType }));
  };

  const plotType = draft.plotType ?? "line";
  const previewColors = resolveColors(draft.colorScheme);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-800">Edit Plot</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-5">

          {/* ── Plot type selector (always at top) ─────────────────────────── */}
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Plot type</span>
            <select
              value={plotType}
              onChange={(e) => handleTypeChange(e.target.value as PlotType)}
              className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none bg-white font-medium"
            >
              {PLOT_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>

          {/* ── Common fields (title, height) ───────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">Title</span>
              <input
                type="text"
                value={draft.title ?? ""}
                onChange={(e) => patch({ title: e.target.value })}
                placeholder="optional"
                className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">Height (px)</span>
              <input
                type="number"
                min={200}
                max={1200}
                step={50}
                value={draft.height ?? 400}
                onChange={(e) => patch({ height: Number(e.target.value) })}
                className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
              />
            </label>
          </div>

          {/* ── Color scheme ─────────────────────────────────────────────────── */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-gray-600">Color scheme</span>
            <div className="flex items-center gap-3">
              <select
                value={draft.colorScheme ?? "default"}
                onChange={(e) => patch({ colorScheme: e.target.value })}
                className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none bg-white"
              >
                {COLOR_SCHEME_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {previewColors && (
                <div className="flex gap-0.5 shrink-0">
                  {previewColors.map((c, i) => (
                    <span
                      key={i}
                      className="inline-block w-5 h-5 rounded-sm border border-gray-200"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              )}
            </div>
          </label>

          {/* ── Type-specific fields ─────────────────────────────────────────── */}
          <div className="border-t border-gray-100 pt-4">
            {plotType === "line"        && <LineEdit        draft={draft} onChange={patch} varNames={varNames} />}
            {plotType === "area"        && <AreaEdit        draft={draft} onChange={patch} varNames={varNames} />}
            {plotType === "pie"         && <PieEdit         draft={draft} onChange={patch} varNames={varNames} />}
            {plotType === "donut"       && <DonutEdit       draft={draft} onChange={patch} varNames={varNames} />}
            {plotType === "heatmap" && <HeatmapEdit draft={draft} onChange={patch} varNames={varNames} />}
            {plotType === "scatter" && <ScatterEdit draft={draft} onChange={patch} varNames={varNames} />}
            {plotType === "bar"     && <BarEdit     draft={draft} onChange={patch} varNames={varNames} />}
            {plotType === "combo"   && <ComboEdit   draft={draft} onChange={patch} varNames={varNames} />}
            {plotType === "surface" && <SurfaceEdit draft={draft} onChange={patch} varNames={varNames} />}
            {plotType === "bubble"  && <BubbleEdit  draft={draft} onChange={patch} varNames={varNames} />}
          </div>

        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200">
          <button
            onClick={onCancel}
            className="rounded border border-gray-300 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(draft)}
            className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
