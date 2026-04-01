import dynamic from "next/dynamic";
import type { PlotDefinition } from "../types";
import type { SolveResult } from "@/solver/types";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

function matrixTo2d(real: Record<string, number>, size: string): number[][] {
  const [rows, cols] = size.split("x").map(Number);
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => real[`${r}-${c}`] ?? 0),
  );
}

function matrixTo1d(real: Record<string, number>, size: string): number[] {
  const [rows, cols] = size.split("x").map(Number);
  const n = Math.max(rows, cols);
  const isRow = rows === 1;
  return Array.from({ length: n }, (_, i) => real[isRow ? `0-${i}` : `${i}-0`] ?? 0);
}

function getResult(name: string, results: Map<string, SolveResult>) {
  for (const r of results.values()) {
    if (r.variableName.toLowerCase() === name.toLowerCase() && r.solution) return r.solution;
  }
  return null;
}

interface Props {
  revision?: number;
  def: PlotDefinition;
  solverResults?: Map<string, SolveResult>;
}

export default function SurfaceView({ def, solverResults, revision }: Props) {
  const height     = def.height ?? 500;
  const colorscale = def.colorscale ?? "Viridis";
  const opacity    = def.surfaceOpacity ?? 1;
  const showContours = def.showSurfaceContours ?? false;

  const zResult = solverResults && def.hmZVar ? getResult(def.hmZVar, solverResults) : null;
  const xResult = solverResults && def.hmXVar ? getResult(def.hmXVar, solverResults) : null;
  const yResult = solverResults && def.hmYVar ? getResult(def.hmYVar, solverResults) : null;

  if (!zResult) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-400"
        style={{ height }}
      >
        <span>Surface plot — no data (set Z matrix variable)</span>
      </div>
    );
  }

  const z      = matrixTo2d(zResult.real, zResult.size);
  const xTicks = xResult ? matrixTo1d(xResult.real, xResult.size) : undefined;
  const yTicks = yResult ? matrixTo1d(yResult.real, yResult.size) : undefined;

  const contours = showContours ? {
    x: { show: true, usecolormap: true, highlightcolor: "#42f462", project: { x: true } },
    y: { show: true, usecolormap: true, highlightcolor: "#42f462", project: { y: true } },
    z: { show: true, usecolormap: true, highlightcolor: "#42f462", project: { z: true } },
  } : undefined;

  const trace: Record<string, unknown> = {
    type: "surface",
    z,
    colorscale,
    opacity,
    showscale: true,
    ...(xTicks ? { x: xTicks } : {}),
    ...(yTicks ? { y: yTicks } : {}),
    ...(contours ? { contours } : {}),
  };

  return (
    <Plot
      revision={revision}
      data={[trace as never]}
      layout={{
        title: def.title ? { text: def.title, font: { size: 14 } } : undefined,
        scene: {
          xaxis: { title: { text: def.xLabel || def.hmXVar || "" } },
          yaxis: { title: { text: def.yLabel || def.hmYVar || "" } },
          zaxis: { title: { text: def.zLabel || def.hmZVar || "" } },
        },
        margin: { t: def.title ? 50 : 30, r: 20, b: 20, l: 20 },
        autosize: true,
        paper_bgcolor: "white",
      }}
      style={{ width: "100%", height }}
      useResizeHandler
      config={{ displayModeBar: true, responsive: true, displaylogo: false }}
    />
  );
}
