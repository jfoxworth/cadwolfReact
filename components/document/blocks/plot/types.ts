// ─── Plot type discriminant ───────────────────────────────────────────────────

export type PlotType = "line" | "area" | "scatter" | "bar" | "combo" | "pie" | "donut" | "heatmap" | "surface" | "bubble";

// ─── Line / Area chart ────────────────────────────────────────────────────────

/** Per-series type for combo charts */
export type ComboSeriesType = "bar" | "line" | "scatter";

export interface PlotSeries {
  x: string;
  y: string;
  label?: string;
  mode?: "lines" | "markers" | "lines+markers";
  color?: string;
  lineWidth?: number;
  markerSize?: number;
  /** Pre-computed fallback values (stored in DB so chart renders before solver runs) */
  xValues?: number[];
  yValues?: number[];
  /** Combo chart: which trace type this series renders as */
  seriesType?: ComboSeriesType;
  /** Combo chart: which Y axis ("y1" = primary, "y2" = secondary) */
  yAxis?: "y1" | "y2";
}

/** Area chart stacking mode */
export type AreaMode = "standard" | "stacked" | "normalized";

// ─── Pie / Donut chart ────────────────────────────────────────────────────────

export interface PieOptions {
  /** Variable name whose vector values become slice sizes */
  valuesVar?: string;
  /** Comma-separated labels, one per slice */
  labels?: string;
  /** What to render on each slice */
  textInfo?: "label" | "value" | "percent" | "label+percent" | "label+value" | "none";
  /** Fraction of radius cut out as a hole (donut only, 0.1–0.9) */
  hole?: number;
  /** Zero-based index of the slice to pull out; -1 = none */
  pullIndex?: number;
  /** Pull-out distance (0–0.5) */
  pullAmount?: number;
  /** Stored fallback values (cached from last solver run) */
  storedValues?: number[];
}

// ─── Bar chart ────────────────────────────────────────────────────────────────

/** "group" = side-by-side, "stack" = stacked, "relative" = 100% stacked */
export type BarMode = "group" | "stack" | "relative";
export type BarOrientation = "v" | "h";
export type BarTextPosition = "none" | "inside" | "outside" | "auto";

// ─── Bubble chart ─────────────────────────────────────────────────────────────

export interface BubbleSeries {
  x: string;
  y: string;
  size: string;
  label?: string;
  color?: string;
  maxBubbleSize?: number;
  xValues?: number[];
  yValues?: number[];
  sizeValues?: number[];
}

// ─── Heatmap ──────────────────────────────────────────────────────────────────

export interface HeatmapOptions {
  /** Solved matrix variable name — provides the Z (heat) values */
  hmZVar?: string;
  /** Optional solved vector for X tick labels */
  hmXVar?: string;
  /** Optional solved vector for Y tick labels */
  hmYVar?: string;
  /** Show numeric values inside each cell */
  showNumbers?: boolean;
  /** Plotly continuous colorscale name (e.g. "Viridis", "Hot") */
  colorscale?: string;
}

// ─── Unified definition ───────────────────────────────────────────────────────

export interface PlotDefinition extends PieOptions, HeatmapOptions {
  plotType?: PlotType;
  title?: string;
  showLegend?: boolean;
  height?: number;
  colorScheme?: string;
  // Line / area chart fields
  xLabel?: string;
  yLabel?: string;
  series?: PlotSeries[];
  // Area chart specific
  areaMode?: AreaMode;
  // Bubble chart specific
  bubbleSeries?: BubbleSeries[];
  // Bar chart specific
  barMode?: BarMode;
  barOrientation?: BarOrientation;
  barTextPosition?: BarTextPosition;
  // Combo chart specific
  y2Label?: string;
  // Surface plot specific
  surfaceOpacity?: number;
  showSurfaceContours?: boolean;
  zLabel?: string;
  // Manual axis limits (both must be set; leave undefined for auto)
  yMin?: number;
  yMax?: number;
  xMin?: number;
  xMax?: number;
  /** Combo chart: limits for the secondary (right) Y axis */
  y2Min?: number;
  y2Max?: number;
}
