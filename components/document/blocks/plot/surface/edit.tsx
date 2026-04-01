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

const COLORSCALES = [
  "Viridis", "Plasma", "Inferno", "Magma", "Cividis",
  "Hot", "Blues", "Greens", "Reds",
  "YlOrRd", "YlGnBu", "RdBu", "Picnic", "Portland",
  "Earth", "Electric", "Rainbow", "Jet",
];

interface Props {
  draft: PlotDefinition;
  varNames: string[];
  onChange: (patch: Partial<PlotDefinition>) => void;
}

export default function SurfaceEdit({ draft, varNames, onChange }: Props) {
  return (
    <div className="flex flex-col gap-4">

      {/* ── Z matrix variable ────────────────────────────────────────────── */}
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-600">Z matrix variable</span>
        <VarSelect value={draft.hmZVar ?? ""} onChange={(v) => onChange({ hmZVar: v })} varNames={varNames} />
        <span className="text-xs text-gray-400">2D matrix — each row is a Y slice, each column is an X position</span>
      </label>

      {/* ── Optional X / Y axis vectors ──────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">X vector (optional)</span>
          <VarSelect value={draft.hmXVar ?? ""} onChange={(v) => onChange({ hmXVar: v })} varNames={varNames} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Y vector (optional)</span>
          <VarSelect value={draft.hmYVar ?? ""} onChange={(v) => onChange({ hmYVar: v })} varNames={varNames} />
        </label>
      </div>

      {/* ── Axis labels ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">X-axis label</span>
          <input type="text" value={draft.xLabel ?? ""} onChange={(e) => onChange({ xLabel: e.target.value })}
            placeholder="optional" className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Y-axis label</span>
          <input type="text" value={draft.yLabel ?? ""} onChange={(e) => onChange({ yLabel: e.target.value })}
            placeholder="optional" className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Z-axis label</span>
          <input type="text" value={draft.zLabel ?? ""} onChange={(e) => onChange({ zLabel: e.target.value })}
            placeholder="optional" className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none" />
        </label>
      </div>

      {/* ── Color scale ──────────────────────────────────────────────────── */}
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-600">Color scale</span>
        <select
          value={draft.colorscale ?? "Viridis"}
          onChange={(e) => onChange({ colorscale: e.target.value })}
          className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none bg-white"
        >
          {COLORSCALES.map((cs) => (
            <option key={cs} value={cs}>{cs}</option>
          ))}
        </select>
      </label>

      {/* ── Opacity ──────────────────────────────────────────────────────── */}
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-600">
          Opacity — {Math.round((draft.surfaceOpacity ?? 1) * 100)}%
        </span>
        <input
          type="range"
          min={0.1}
          max={1}
          step={0.05}
          value={draft.surfaceOpacity ?? 1}
          onChange={(e) => onChange({ surfaceOpacity: Number(e.target.value) })}
          className="w-full"
        />
      </label>

      {/* ── Options ──────────────────────────────────────────────────────── */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={draft.showSurfaceContours ?? false}
          onChange={(e) => onChange({ showSurfaceContours: e.target.checked })}
          className="rounded"
        />
        <span className="text-sm text-gray-700">Show contour projections on axes</span>
      </label>

    </div>
  );
}
