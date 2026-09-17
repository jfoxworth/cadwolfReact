import type { PlotDefinition } from "./types";

/** Options for the per-series "which Y axis" <select>, shared across chart-type editors. */
export const Y_AXIS_OPTIONS: { value: "y1" | "y2"; label: string }[] = [
  { value: "y1", label: "Left (Y1)" },
  { value: "y2", label: "Right (Y2)" },
];

/**
 * Given a chart's series (each optionally assigned to "y2") and the definition's
 * Y2 label/range, returns whether any series uses the secondary axis and the
 * Plotly `yaxis2` layout entry to merge in when it does.
 */
export function resolveY2Axis(
  series: { yAxis?: "y1" | "y2" }[],
  def: Pick<PlotDefinition, "y2Label" | "y2Min" | "y2Max">,
) {
  const hasY2 = series.some((s) => s.yAxis === "y2");
  const range = def.y2Min !== undefined && def.y2Max !== undefined
    ? ([def.y2Min, def.y2Max] as [number, number])
    : undefined;

  return {
    hasY2,
    yaxis2Layout: hasY2
      ? {
          title: { text: def.y2Label ?? "" },
          overlaying: "y" as const,
          side: "right" as const,
          automargin: true,
          showgrid: false,
          ...(range ? { range } : {}),
        }
      : undefined,
  };
}
