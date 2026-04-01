import { useCallback } from "react";
import type { PlotDefinition, PlotSeries, BarMode, BarOrientation, BarTextPosition } from "../types";

function emptySeries(): PlotSeries {
  return { x: "", y: "", label: "", color: "#2563eb" };
}

function VarSelect({ value, onChange, varNames }: { value: string; onChange: (v: string) => void; varNames: string[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none bg-white">
      <option value="">— none —</option>
      {varNames.map((v) => <option key={v} value={v}>{v}</option>)}
    </select>
  );
}

interface SeriesRowProps {
  series: PlotSeries;
  index: number;
  varNames: string[];
  onChange: (i: number, s: PlotSeries) => void;
  onRemove: (i: number) => void;
}

function SeriesRow({ series, index, varNames, onChange, onRemove }: SeriesRowProps) {
  const up = (patch: Partial<PlotSeries>) => onChange(index, { ...series, ...patch });
  return (
    <div className="rounded border border-gray-200 bg-gray-50 p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Series {index + 1}</span>
        <button onClick={() => onRemove(index)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-0.5">
          <span className="text-xs text-gray-500">X variable</span>
          <VarSelect value={series.x} onChange={(v) => up({ x: v })} varNames={varNames} />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-xs text-gray-500">Y variable</span>
          <VarSelect value={series.y} onChange={(v) => up({ y: v })} varNames={varNames} />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-0.5">
          <span className="text-xs text-gray-500">Label (legend)</span>
          <input type="text" value={series.label ?? ""} onChange={(e) => up({ label: e.target.value })} placeholder="optional"
            className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none" />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-xs text-gray-500">Color</span>
          <div className="flex items-center gap-1.5">
            <input type="color" value={series.color ?? "#2563eb"} onChange={(e) => up({ color: e.target.value })}
              className="h-8 w-10 cursor-pointer rounded border border-gray-300 p-0.5" />
            <span className="text-xs text-gray-400 font-mono">{series.color ?? "#2563eb"}</span>
          </div>
        </label>
      </div>
    </div>
  );
}

interface Props {
  draft: PlotDefinition;
  varNames: string[];
  onChange: (patch: Partial<PlotDefinition>) => void;
}

export default function BarEdit({ draft, varNames, onChange }: Props) {
  const handleSeriesChange = useCallback((i: number, s: PlotSeries) => {
    const series = [...(draft.series ?? [])];
    series[i] = s;
    onChange({ series });
  }, [draft.series, onChange]);

  const handleRemove = useCallback((i: number) => {
    const series = [...(draft.series ?? [])];
    series.splice(i, 1);
    onChange({ series });
  }, [draft.series, onChange]);

  return (
    <div className="flex flex-col gap-4">

      {/* ── Bar options ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Orientation</span>
          <select value={draft.barOrientation ?? "v"} onChange={(e) => onChange({ barOrientation: e.target.value as BarOrientation })}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none bg-white">
            <option value="v">Vertical</option>
            <option value="h">Horizontal</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Grouping</span>
          <select value={draft.barMode ?? "group"} onChange={(e) => onChange({ barMode: e.target.value as BarMode })}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none bg-white">
            <option value="group">Grouped (side-by-side)</option>
            <option value="stack">Stacked</option>
            <option value="relative">Stacked — 100%</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Bar labels</span>
          <select value={draft.barTextPosition ?? "none"} onChange={(e) => onChange({ barTextPosition: e.target.value as BarTextPosition })}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none bg-white">
            <option value="none">None</option>
            <option value="inside">Inside</option>
            <option value="outside">Outside</option>
            <option value="auto">Auto</option>
          </select>
        </label>
      </div>

      {/* ── Axis labels + legend ─────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">X-axis label</span>
          <input type="text" value={draft.xLabel ?? ""} onChange={(e) => onChange({ xLabel: e.target.value })}
            placeholder="auto" className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Y-axis label</span>
          <input type="text" value={draft.yLabel ?? ""} onChange={(e) => onChange({ yLabel: e.target.value })}
            placeholder="auto" className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none" />
        </label>
        <label className="flex items-center gap-2 pt-5 cursor-pointer">
          <input type="checkbox" checked={draft.showLegend ?? true} onChange={(e) => onChange({ showLegend: e.target.checked })} className="rounded" />
          <span className="text-sm text-gray-700">Show legend</span>
        </label>
      </div>

      {/* ── Axis limits ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Y min</span>
          <input type="number" value={draft.yMin ?? ""} placeholder="auto"
            onChange={(e) => onChange({ yMin: e.target.value === "" ? undefined : Number(e.target.value) })}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Y max</span>
          <input type="number" value={draft.yMax ?? ""} placeholder="auto"
            onChange={(e) => onChange({ yMax: e.target.value === "" ? undefined : Number(e.target.value) })}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">X min</span>
          <input type="number" value={draft.xMin ?? ""} placeholder="auto"
            onChange={(e) => onChange({ xMin: e.target.value === "" ? undefined : Number(e.target.value) })}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">X max</span>
          <input type="number" value={draft.xMax ?? ""} placeholder="auto"
            onChange={(e) => onChange({ xMax: e.target.value === "" ? undefined : Number(e.target.value) })}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none" />
        </label>
      </div>

      {/* ── Series ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-600">Series</span>
          <button
            onClick={() => onChange({ series: [...(draft.series ?? []), emptySeries()] })}
            className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
          >
            + Add series
          </button>
        </div>
        {(draft.series ?? []).length === 0 && (
          <p className="text-xs text-gray-400 italic py-2">No series yet — click "Add series" to start.</p>
        )}
        {(draft.series ?? []).map((s, i) => (
          <SeriesRow key={i} series={s} index={i} varNames={varNames} onChange={handleSeriesChange} onRemove={handleRemove} />
        ))}
      </div>
    </div>
  );
}
