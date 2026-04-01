import { useCallback } from "react";
import type { PlotDefinition, PlotSeries, ComboSeriesType, BarMode } from "../types";

function emptySeries(): PlotSeries {
  return { x: "", y: "", label: "", seriesType: "bar", yAxis: "y1", color: "#2563eb", lineWidth: 2, markerSize: 6 };
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
  const seriesType = series.seriesType ?? "bar";
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
      <div className="grid grid-cols-4 gap-2">
        <label className="flex flex-col gap-0.5">
          <span className="text-xs text-gray-500">Type</span>
          <select value={seriesType} onChange={(e) => up({ seriesType: e.target.value as ComboSeriesType })}
            className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none bg-white">
            <option value="bar">Bar</option>
            <option value="line">Line</option>
            <option value="scatter">Scatter</option>
          </select>
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-xs text-gray-500">Y axis</span>
          <select value={series.yAxis ?? "y1"} onChange={(e) => up({ yAxis: e.target.value as "y1" | "y2" })}
            className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none bg-white">
            <option value="y1">Left (Y1)</option>
            <option value="y2">Right (Y2)</option>
          </select>
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-xs text-gray-500">Label</span>
          <input type="text" value={series.label ?? ""} onChange={(e) => up({ label: e.target.value })} placeholder="optional"
            className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none" />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-xs text-gray-500">Color</span>
          <div className="flex items-center gap-1">
            <input type="color" value={series.color ?? "#2563eb"} onChange={(e) => up({ color: e.target.value })}
              className="h-8 w-10 cursor-pointer rounded border border-gray-300 p-0.5" />
          </div>
        </label>
      </div>
      {/* Line/scatter-specific controls */}
      {(seriesType === "line") && (
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-0.5">
            <span className="text-xs text-gray-500">Mode</span>
            <select value={series.mode ?? "lines"} onChange={(e) => up({ mode: e.target.value as PlotSeries["mode"] })}
              className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none bg-white">
              <option value="lines">Lines</option>
              <option value="markers">Markers</option>
              <option value="lines+markers">Lines + Markers</option>
            </select>
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-xs text-gray-500">Line width</span>
            <input type="number" min={0.5} max={10} step={0.5} value={series.lineWidth ?? 2}
              onChange={(e) => up({ lineWidth: Number(e.target.value) })}
              className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none" />
          </label>
        </div>
      )}
    </div>
  );
}

interface Props {
  draft: PlotDefinition;
  varNames: string[];
  onChange: (patch: Partial<PlotDefinition>) => void;
}

export default function ComboEdit({ draft, varNames, onChange }: Props) {
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

      {/* ── Chart-level options ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Bar grouping</span>
          <select value={draft.barMode ?? "group"} onChange={(e) => onChange({ barMode: e.target.value as BarMode })}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none bg-white">
            <option value="group">Grouped (side-by-side)</option>
            <option value="stack">Stacked</option>
            <option value="relative">Stacked — 100%</option>
          </select>
        </label>
        <label className="flex items-center gap-2 pt-5 cursor-pointer">
          <input type="checkbox" checked={draft.showLegend ?? true} onChange={(e) => onChange({ showLegend: e.target.checked })} className="rounded" />
          <span className="text-sm text-gray-700">Show legend</span>
        </label>
      </div>

      {/* ── Axis labels ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">X-axis label</span>
          <input type="text" value={draft.xLabel ?? ""} onChange={(e) => onChange({ xLabel: e.target.value })}
            placeholder="auto" className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Y1 label (left)</span>
          <input type="text" value={draft.yLabel ?? ""} onChange={(e) => onChange({ yLabel: e.target.value })}
            placeholder="optional" className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Y2 label (right)</span>
          <input type="text" value={draft.y2Label ?? ""} onChange={(e) => onChange({ y2Label: e.target.value })}
            placeholder="optional" className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none" />
        </label>
      </div>

      {/* ── Axis limits ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Y1 min (left)</span>
          <input type="number" value={draft.yMin ?? ""} placeholder="auto"
            onChange={(e) => onChange({ yMin: e.target.value === "" ? undefined : Number(e.target.value) })}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Y1 max (left)</span>
          <input type="number" value={draft.yMax ?? ""} placeholder="auto"
            onChange={(e) => onChange({ yMax: e.target.value === "" ? undefined : Number(e.target.value) })}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none" />
        </label>
        <div />
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Y2 min (right)</span>
          <input type="number" value={draft.y2Min ?? ""} placeholder="auto"
            onChange={(e) => onChange({ y2Min: e.target.value === "" ? undefined : Number(e.target.value) })}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Y2 max (right)</span>
          <input type="number" value={draft.y2Max ?? ""} placeholder="auto"
            onChange={(e) => onChange({ y2Max: e.target.value === "" ? undefined : Number(e.target.value) })}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none" />
        </label>
        <div />
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
