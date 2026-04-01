import colorsJson from "./colors.json";

export interface ColorScheme {
  label: string;
  colors: string[];
}

// ─── Schemes from colors.json ─────────────────────────────────────────────────

const fromJson: Record<string, ColorScheme> = {
  night:      { label: "Night",      colors: colorsJson.night_colors },
  sunflowers: { label: "Sunflowers", colors: colorsJson.sunflowers_colors },
  irises:     { label: "Irises",     colors: colorsJson.irises_colors },
  cafe:       { label: "Café",       colors: colorsJson.cafe_colors },
};

// ─── Sequential / diverging schemes ──────────────────────────────────────────

const sequential: Record<string, ColorScheme> = {
  reds: {
    label: "Reds",
    colors: ["#fee5d9", "#fcbba1", "#fc9272", "#fb6a4a", "#de2d26", "#a50f15"],
  },
  greens: {
    label: "Greens",
    colors: ["#edf8e9", "#bae4b3", "#74c476", "#31a354", "#006d2c", "#00441b"],
  },
  blues: {
    label: "Blues",
    colors: ["#eff3ff", "#bdd7e7", "#6baed6", "#3182bd", "#08519c", "#08306b"],
  },
  rdbu: {
    label: "RdBu (diverging)",
    colors: ["#b2182b", "#ef8a62", "#fddbc7", "#d1e5f0", "#67a9cf", "#2166ac"],
  },
};

// ─── Exported map & ordered list ──────────────────────────────────────────────

export const COLOR_SCHEMES: Record<string, ColorScheme> = {
  ...fromJson,
  ...sequential,
};

export const COLOR_SCHEME_OPTIONS: { value: string; label: string }[] = [
  { value: "default", label: "Default (Plotly)" },
  ...Object.entries(COLOR_SCHEMES).map(([value, { label }]) => ({ value, label })),
];

/** Resolve a scheme name to a color array. Returns undefined for "default". */
export function resolveColors(scheme?: string): string[] | undefined {
  if (!scheme || scheme === "default") return undefined;
  return COLOR_SCHEMES[scheme]?.colors;
}
