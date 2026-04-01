import dynamic from "next/dynamic";
import type { PlotDefinition } from "../types";
import type { SolveResult } from "@/solver/types";
import { resolveColors } from "../colorSchemes";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

function matrixToArray(real: Record<string, number>, size: string): number[] {
  const [rows, cols] = size.split("x").map(Number);
  const n = Math.max(rows, cols);
  const isRow = rows === 1;
  return Array.from({ length: n }, (_, i) => real[isRow ? `0-${i}` : `${i}-0`] ?? 0);
}

function getVar(name: string, results: Map<string, SolveResult>) {
  for (const r of results.values()) {
    if (r.variableName.toLowerCase() === name.toLowerCase() && r.solution) {
      return { values: matrixToArray(r.solution.real, r.solution.size), units: r.solution.units };
    }
  }
  return { values: [], units: "" };
}

interface Props {
  revision?: number;
  def: PlotDefinition;
  solverResults?: Map<string, SolveResult>;
}

export default function BubbleView({ def, solverResults, revision }: Props) {
  const series = def.bubbleSeries ?? [];
  const height = def.height ?? 400;
  const colorway = resolveColors(def.colorScheme);

  const traces = series
    .filter((s) => s.x || s.y)
    .map((s, idx) => {
      const liveX    = solverResults && s.x    ? getVar(s.x,    solverResults) : { values: [], units: "" };
      const liveY    = solverResults && s.y    ? getVar(s.y,    solverResults) : { values: [], units: "" };
      const liveSize = solverResults && s.size ? getVar(s.size, solverResults) : { values: [], units: "" };
      const xVals    = s.x    ? liveX.values    : (s.xValues    ?? []);
      const yVals    = s.y    ? liveY.values    : (s.yValues    ?? []);
      const sizeVals = s.size ? liveSize.values : (s.sizeValues ?? []);
      const color = s.color ?? (colorway?.[idx % (colorway?.length ?? 1)] ?? "#2563eb");
      return {
        x: xVals,
        y: yVals,
        name: s.label || s.y || s.x,
        mode: "markers" as const,
        type: "scatter" as const,
        marker: {
          size: sizeVals.length > 0 ? sizeVals : 12,
          sizemode: "area" as const,
          sizeref: sizeVals.length > 0
            ? (2 * Math.max(...sizeVals)) / ((s.maxBubbleSize ?? 40) ** 2)
            : 1,
          color,
          line: { color: "white", width: 1 },
        },
      };
    });

  const firstX = series[0]?.x ?? "";
  const firstY = series[0]?.y ?? "";
  const xUnits = solverResults && firstX ? getVar(firstX, solverResults).units : "";
  const yUnits = solverResults && firstY ? getVar(firstY, solverResults).units : "";
  const yRange = def.yMin !== undefined && def.yMax !== undefined ? [def.yMin, def.yMax] as [number, number] : undefined;
  const xRange = def.xMin !== undefined && def.xMax !== undefined ? [def.xMin, def.xMax] as [number, number] : undefined;

  if (traces.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-400"
        style={{ height }}
      >
        <span>Bubble chart — no series defined</span>
      </div>
    );
  }

  return (
    <Plot
      revision={revision}
      data={traces}
      layout={{
        title: def.title ? { text: def.title, font: { size: 14 } } : undefined,
        showlegend: def.showLegend ?? true,
        xaxis: {
          title: { text: def.xLabel || (xUnits ? `${firstX} (${xUnits})` : firstX) },
          automargin: true,
          gridcolor: "#e5e7eb",
          linecolor: "#d1d5db",
          ...(xRange ? { range: xRange } : {}),
        },
        yaxis: {
          title: { text: def.yLabel || (yUnits ? `${firstY} (${yUnits})` : firstY) },
          automargin: true,
          gridcolor: "#e5e7eb",
          linecolor: "#d1d5db",
          ...(yRange ? { range: yRange } : {}),
        },
        margin: { t: def.title ? 50 : 20, r: 20, b: 60, l: 70 },
        autosize: true,
        paper_bgcolor: "white",
        plot_bgcolor: "#f9fafb",
        ...(colorway ? { colorway } : {}),
        legend: { orientation: "h", y: -0.2 },
      }}
      style={{ width: "100%", height }}
      useResizeHandler
      config={{ displayModeBar: true, responsive: true, displaylogo: false }}
    />
  );
}
