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

function getValues(name: string, results: Map<string, SolveResult>): number[] {
  for (const r of results.values()) {
    if (r.variableName.toLowerCase() === name.toLowerCase() && r.solution) {
      return matrixToArray(r.solution.real, r.solution.size);
    }
  }
  return [];
}

interface Props {
  revision?: number;
  def: PlotDefinition;
  solverResults?: Map<string, SolveResult>;
  /** Hole fraction: 0 for pie, >0 for donut */
  hole?: number;
}

export default function PieView({ def, solverResults, hole = 0, revision }: Props) {
  const height = def.height ?? 400;
  const colorway = resolveColors(def.colorScheme);

  const values: number[] =
    def.valuesVar
      ? (solverResults ? getValues(def.valuesVar, solverResults) : [])
      : (def.storedValues ?? []);

  const labelList: string[] = def.labels
    ? def.labels.split(",").map((s) => s.trim()).filter(Boolean)
    : values.map((_, i) => String(i + 1));

  const pullArr = values.map((_, i) =>
    i === (def.pullIndex ?? -1) ? (def.pullAmount ?? 0.1) : 0,
  );

  if (values.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-400"
        style={{ height }}
      >
        <span>{hole > 0 ? "Donut" : "Pie"} chart — no data</span>
      </div>
    );
  }

  return (
    <Plot
      revision={revision}
      data={[{
        type: "pie" as const,
        values,
        labels: labelList.length === values.length ? labelList : values.map((_, i) => String(i + 1)),
        hole,
        pull: pullArr,
        textinfo: (def.textInfo ?? "percent") as "label" | "value" | "percent" | "label+percent" | "label+value" | "none",
        automargin: true,
        ...(colorway ? { marker: { colors: colorway } } : {}),
      }]}
      layout={{
        title: def.title ? { text: def.title, font: { size: 14 } } : undefined,
        showlegend: def.showLegend ?? true,
        margin: { t: def.title ? 50 : 20, r: 20, b: 20, l: 20 },
        autosize: true,
        paper_bgcolor: "white",
        ...(colorway ? { colorway } : {}),
      }}
      style={{ width: "100%", height }}
      useResizeHandler
      config={{ displayModeBar: true, responsive: true, displaylogo: false }}
    />
  );
}
