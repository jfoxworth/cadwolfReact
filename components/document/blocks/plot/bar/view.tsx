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

export default function BarView({ def, solverResults, revision }: Props) {
  const series      = def.series ?? [];
  const height      = def.height ?? 400;
  const orientation = def.barOrientation ?? "v";
  const barMode     = def.barMode ?? "group";
  const textPos     = def.barTextPosition ?? "none";
  const colorway    = resolveColors(def.colorScheme);

  const traces = series
    .filter((s) => s.x || s.y || (s.xValues && s.xValues.length > 0))
    .map((s) => {
      const liveX = solverResults && s.x ? getVar(s.x, solverResults) : { values: [], units: "" };
      const liveY = solverResults && s.y ? getVar(s.y, solverResults) : { values: [], units: "" };
      const xVals = s.x ? liveX.values : (s.xValues ?? []);
      const yVals = s.y ? liveY.values : (s.yValues ?? []);

      // For horizontal bars, swap x↔y
      const traceX = orientation === "h" ? yVals : xVals;
      const traceY = orientation === "h" ? xVals : yVals;

      return {
        x: traceX,
        y: traceY,
        name: s.label || s.y || s.x,
        type: "bar" as const,
        orientation,
        marker: { color: s.color ?? "#2563eb" },
        text: textPos !== "none" ? (orientation === "h" ? traceX : traceY).map(String) : undefined,
        textposition: textPos !== "none" ? textPos : undefined,
      };
    });

  const firstX = series[0]?.x ?? "";
  const firstY = series[0]?.y ?? "";
  const xUnits = solverResults && firstX ? getVar(firstX, solverResults).units : "";
  const yUnits = solverResults && firstY ? getVar(firstY, solverResults).units : "";
  const yRange = def.yMin !== undefined && def.yMax !== undefined ? [def.yMin, def.yMax] as [number, number] : undefined;
  const xRange = def.xMin !== undefined && def.xMax !== undefined ? [def.xMin, def.xMax] as [number, number] : undefined;

  // For horizontal bars, axis labels are swapped
  const xAxisLabel = orientation === "h"
    ? (def.yLabel || (yUnits ? `${firstY} (${yUnits})` : firstY))
    : (def.xLabel || (xUnits ? `${firstX} (${xUnits})` : firstX));
  const yAxisLabel = orientation === "h"
    ? (def.xLabel || (xUnits ? `${firstX} (${xUnits})` : firstX))
    : (def.yLabel || (yUnits ? `${firstY} (${yUnits})` : firstY));

  if (traces.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-400"
        style={{ height }}
      >
        <span>Bar chart — no series defined</span>
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
        barmode: barMode,
        xaxis: {
          title: { text: xAxisLabel },
          automargin: true,
          gridcolor: "#e5e7eb",
          linecolor: "#d1d5db",
          ...(xRange ? { range: xRange } : {}),
        },
        yaxis: {
          title: { text: yAxisLabel },
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
