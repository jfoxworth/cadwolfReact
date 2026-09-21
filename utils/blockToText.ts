import type { Block } from "@/types/document";

/** "raw = value units" (or just "raw" if unsolved, or an error marker) for an EQUATION block —
 *  shared by blockToContextLine's own EQUATION case and CARD, which cross-references it. */
export function formatEquationLine(b: Block): string | null {
  const def = b.definition as Record<string, unknown>;
  const raw = def.raw as string | undefined;
  if (!raw) return null;
  const sol = b.solution as { real?: Record<string, number>; size?: string; units?: string; errors?: string[] } | undefined;
  if (sol?.errors && sol.errors.length > 0) return `${raw} [ERROR: ${sol.errors[0]}]`;
  if (!sol?.real) return raw;
  if (sol.size === "1x1") {
    const val = sol.real["0-0"] ?? 0;
    return `${raw} = ${val}${sol.units ? ` ${sol.units}` : ""}`;
  }
  return `${raw} [${sol.size}]`;
}

/** One-line plain-text summary of a block's content — used for the AI chat's page-context
 *  dump/single-block summary (documentWrapper.tsx) and for building embedding chunk text
 *  (RAG pipeline). Every block type should show real content here — a bare "[TYPE]" tag gives
 *  neither the AI nor a search index anything to work with. `allBlocks` is only needed by
 *  CARD, which is a pure reference to another block and has no content of its own to describe. */
export function blockToContextLine(b: Block, allBlocks?: Block[]): string | null {
  const def = b.definition as Record<string, unknown>;
  switch (b.type) {
    case "EQUATION":
      return formatEquationLine(b);
    case "SYMBOLIC_EQUATION":
      return def.expression as string ?? null;
    case "HEADER":
      return `# ${def.text as string ?? ""}`;
    case "TEXT":
      return def.text as string ?? null;
    case "SLIDER":
      return `${def.variableName} = ${def.value}${def.unit ? ` ${def.unit}` : ""} (slider, range ${def.min}–${def.max})`;
    case "DROPDOWN":
    case "SELECT_BLOCK": {
      const opts = def.options as string[] | undefined;
      const idx = def.selectedIndex as number | undefined ?? 0;
      return `${def.variableName} = ${opts?.[idx] ?? ""} (dropdown)`;
    }
    case "FOR_LOOP":
      return `for ${def.variable} = ${def.start} to ${def.end} step ${def.step}`;
    case "WHILE_LOOP":
      return `while ${def.lhs} ${def.operator} ${def.rhs}`;
    case "IF_ELSE": {
      const branches = (def.branches as {
        type: string;
        conditions: { flagText: string; conditionText: string; dependentText: string; blockOption: string }[];
        children?: { definition?: { raw?: string } }[];
      }[]) ?? [];
      const parts = branches.map((br) => {
        const label = br.type === "else" || br.conditions.length === 0
          ? br.type
          : `${br.type} (${br.conditions
              .map((c, i) => (i === 0 ? `${c.flagText} ${c.conditionText} ${c.dependentText}` : `${c.blockOption} ${c.flagText} ${c.conditionText} ${c.dependentText}`))
              .join(" ")})`;
        // Include each branch's equations — a summary of the condition alone isn't enough
        // context to propose an edit against (same reasoning CARD needed allBlocks for).
        const eqs = (br.children ?? []).map((c) => c.definition?.raw).filter(Boolean).join("; ");
        return eqs ? `${label} {${eqs}}` : label;
      });
      return parts.length ? parts.join(" / ") : null;
    }
    case "IMAGE": {
      const label = (def.alt as string) || (def.caption as string) || (def.src as string) || "";
      return label ? `Image: ${label}` : "Image (no source)";
    }
    case "VIDEO": {
      const label = (def.caption as string) || (def.src as string) || "";
      return label ? `Video: ${label}` : "Video (no source)";
    }
    case "PLOT": {
      const plotType = (def.plotType as string) ?? "line";
      if (plotType === "pie" || plotType === "donut") {
        return `${plotType} chart of ${def.valuesVar ?? "(no data)"}`;
      }
      if (plotType === "heatmap" || plotType === "surface") {
        const axes = [def.hmXVar, def.hmYVar].filter(Boolean).join(", ");
        return `${plotType} of ${def.hmZVar ?? "(no data)"}${axes ? ` (axes: ${axes})` : ""}`;
      }
      if (plotType === "bubble") {
        const series = (def.bubbleSeries as { x?: string; y?: string; size?: string }[]) ?? [];
        const vars = series.map((s) => `${s.x ?? "?"} vs ${s.y ?? "?"} (size: ${s.size ?? "?"})`).join(", ");
        return `bubble chart: ${vars || "(no series)"}`;
      }
      const series = (def.series as { x?: string; y?: string }[]) ?? [];
      const vars = series.map((s) => `${s.x ?? "?"} vs ${s.y ?? "?"}`).join(", ");
      return `${plotType} chart: ${vars || "(no series)"}`;
    }
    case "CARD": {
      const targetId = def.equationBlockId as string | undefined;
      const target = targetId ? allBlocks?.find((ob) => ob.id === targetId) : undefined;
      if (!target) return "Card (no equation linked)";
      const line = formatEquationLine(target);
      return line ? `Card showing: ${line}` : "Card (linked equation has no value)";
    }
    case "LINE_BREAK":
      // Decorative divider — genuinely no content to show, unlike the other types above.
      return null;
    default:
      return `[${b.type}]`;
  }
}

/** Splits a TEXT block's content into paragraph-based sub-chunks once it exceeds maxChars,
 *  rather than embedding an arbitrarily long block as one vector (which dilutes the embedding
 *  across every idea in it) or imposing an authoring size limit on users. Paragraphs are
 *  blank-line-separated; a single paragraph longer than maxChars on its own is still kept
 *  whole (Voyage truncates rather than errors on an over-length input — no need to add a
 *  second splitting strategy just for that rare case). Below the threshold, returns the text
 *  unchanged as a single-element array so callers don't need a separate "no split" branch. */
export function chunkTextBlock(text: string, maxChars = 2000): string[] {
  if (text.length <= maxChars) return [text];

  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const para of paragraphs) {
    const candidate = current ? `${current}\n\n${para}` : para;
    if (candidate.length > maxChars && current) {
      chunks.push(current);
      current = para;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [text];
}
