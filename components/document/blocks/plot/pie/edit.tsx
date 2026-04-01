import type { PlotDefinition } from "../types";

function VarSelect({ value, onChange, varNames }: { value: string; onChange: (v: string) => void; varNames: string[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none bg-white">
      <option value="">— none —</option>
      {varNames.map((v) => <option key={v} value={v}>{v}</option>)}
    </select>
  );
}

interface Props {
  draft: PlotDefinition;
  varNames: string[];
  onChange: (patch: Partial<PlotDefinition>) => void;
  /** Pass true when used inside the donut editor to show the hole slider */
  showHole?: boolean;
}

export default function PieEdit({ draft, varNames, onChange, showHole = false }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {/* Data variable */}
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-600">Values variable</span>
        <VarSelect value={draft.valuesVar ?? ""} onChange={(v) => onChange({ valuesVar: v })} varNames={varNames} />
        <span className="text-xs text-gray-400">Solved vector variable — each element becomes a slice</span>
      </label>

      {/* Labels */}
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-600">Slice labels (comma-separated)</span>
        <input
          type="text"
          value={draft.labels ?? ""}
          onChange={(e) => onChange({ labels: e.target.value })}
          placeholder="e.g. Steel, Concrete, Timber"
          className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
        />
        <span className="text-xs text-gray-400">Leave empty to use indices (1, 2, 3, …)</span>
      </label>

      {/* Text on slices + legend */}
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Text on slices</span>
          <select
            value={draft.textInfo ?? "percent"}
            onChange={(e) => onChange({ textInfo: e.target.value as PlotDefinition["textInfo"] })}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none bg-white"
          >
            <option value="percent">Percent</option>
            <option value="label">Label</option>
            <option value="value">Value</option>
            <option value="label+percent">Label + Percent</option>
            <option value="label+value">Label + Value</option>
            <option value="none">None</option>
          </select>
        </label>
        <label className="flex items-center gap-2 pt-5 cursor-pointer">
          <input
            type="checkbox"
            checked={draft.showLegend ?? true}
            onChange={(e) => onChange({ showLegend: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm text-gray-700">Show legend</span>
        </label>
      </div>

      {/* Donut hole slider (only shown when used in donut editor) */}
      {showHole && (
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">
            Hole size — {Math.round((draft.hole ?? 0.4) * 100)}%
          </span>
          <input
            type="range"
            min={0.1}
            max={0.9}
            step={0.05}
            value={draft.hole ?? 0.4}
            onChange={(e) => onChange({ hole: Number(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>10%</span><span>90%</span>
          </div>
        </label>
      )}

      {/* Pull-out slice */}
      <div className="flex flex-col gap-2 rounded border border-gray-200 bg-gray-50 p-3">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pull out a slice</span>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-600">Slice index (0-based, −1 = none)</span>
            <input
              type="number"
              min={-1}
              step={1}
              value={draft.pullIndex ?? -1}
              onChange={(e) => onChange({ pullIndex: Number(e.target.value) })}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-600">Pull distance (0–0.5)</span>
            <input
              type="number"
              min={0}
              max={0.5}
              step={0.05}
              value={draft.pullAmount ?? 0.1}
              onChange={(e) => onChange({ pullAmount: Number(e.target.value) })}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
