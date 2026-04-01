import { useCallback } from "react";
import type { PlotDefinition, PlotSeries } from "../types";

function emptySeries(): PlotSeries {
  return { x: "", y: "", label: "", mode: "lines", color: "#2563eb", lineWidth: 2, markerSize: 6 };
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
          <span className="text-xs text-gray-500">Mode</span>
          <select value={series.mode ?? "lines"} onChange={(e) => up({ mode: e.target.value as PlotSeries["mode"] })}
            className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none bg-white">
            <option value="lines">Lines</option>
            <option value="markers">Markers</option>
            <option value="lines+markers">Lines + Markers</option>
          </select>
        </label>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <label className="flex flex-col gap-0.5">
          <span className="text-xs text-gray-500">Color</span>
          <div className="flex items-center gap-1.5">
            <input type="color" value={series.color ?? "#2563eb"} onChange={(e) => up({ color: e.target.value })}
              className="h-8 w-10 cursor-pointer rounded border border-gray-300 p-0.5" />
            <span className="text-xs text-gray-400 font-mono">{series.color ?? "#2563eb"}</span>
          </div>
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-xs text-gray-500">Line width</span>
          <input type="number" min={0.5} max={10} step={0.5} value={series.lineWidth ?? 2}
            onChange={(e) => up({ lineWidth: Number(e.target.value) })}
            className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none" />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-xs text-gray-500">Marker size</span>
          <input type="number" min={1} max={20} step={1} value={series.markerSize ?? 6}
            onChange={(e) => up({ markerSize: Number(e.target.value) })}
            className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none" />
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

export default function LineEdit({ draft, varNames, onChange }: Props) {
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
