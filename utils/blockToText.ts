import type { Block, BlockType } from "@/types/document";

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

/** Character budget for the AI chat's page-context dump (documentWrapper.tsx), measured as a
 *  cheap chars/~4≈tokens heuristic rather than a real tokenizer call. Deliberately well below
 *  the smallest context window of any model app/api/chat/route.ts can be pointed at via
 *  AI_MODEL (currently Claude Haiku 4.5) — this budget covers only the page-context string
 *  itself; the system prompt (prompts/_shared.md + prompts/document.md), tool schemas, and the
 *  growing conversation history all consume the same window on top of it and aren't accounted
 *  for here. */
export const PAGE_CONTEXT_CHAR_BUDGET = 100_000;

/** Blocks kept on each side of the selected block when Inspect mode windows context around a
 *  selection instead of using the generic strip-down ladder below. */
export const INSPECT_WINDOW_RADIUS = 10;

/** Block types kept when a document is too large to send in full — the ones with real
 *  standalone content the model can reason about in prose (structure, explanation, math) as
 *  opposed to UI-only or media-referencing blocks (sliders, plots, loops, images, cards, ...). */
const STRIPPED_CONTEXT_TYPES = new Set<BlockType>(["HEADER", "TEXT", "EQUATION", "SYMBOLIC_EQUATION"]);

export interface PageContextResult {
  text: string;
  /** True whenever the generic ladder or the selection window had to strip/truncate content to
   *  fit the budget — not consumed by any caller today, kept for testability and so a future UI
   *  affordance doesn't need to re-derive it by parsing the note back out of `text`. */
  reduced: boolean;
}

interface ContextBlockLine {
  block: Block;
  line: string;
  /** 1-based position among the caller-supplied `visibleBlocks` — same array-order numbering
   *  already used for the selected-block chip's position/total in documentWrapper.tsx (not
   *  re-sorted by `order`), so a window's stated range lines up with what the user sees there. */
  position: number;
}

function toContextLines(visibleBlocks: Block[], allBlocksForRefs: Block[]): ContextBlockLine[] {
  const lines: ContextBlockLine[] = [];
  visibleBlocks.forEach((b, i) => {
    const line = blockToContextLine(b, allBlocksForRefs);
    if (line) lines.push({ block: b, line, position: i + 1 });
  });
  return lines;
}

/** Greedily keeps whole lines (in order) until `budget` would be exceeded. If even the first
 *  line alone is over budget (e.g. one huge TEXT block), hard-slices it rather than returning
 *  nothing — a truncated line is still strictly more useful than an empty context. Takes plain
 *  strings (not the document-specific ContextBlockLine) so other domains (e.g. part trees) can
 *  reuse this same fallback instead of re-implementing it. */
export function truncateLinesToBudget(lines: string[], budget: number): { text: string; keptCount: number } {
  const kept: string[] = [];
  let used = 0;
  for (const line of lines) {
    const addLen = line.length + (kept.length > 0 ? 1 : 0); // +1 for the joining "\n"
    if (used + addLen > budget) break;
    kept.push(line);
    used += addLen;
  }
  if (kept.length === 0 && lines.length > 0 && budget > 20) {
    kept.push(`${lines[0].slice(0, budget - 1)}…`);
    return { text: kept.join("\n"), keptCount: 1 };
  }
  return { text: kept.join("\n"), keptCount: kept.length };
}

/** Builds the AI chat's page-context dump for Overview/Build modes, and for Inspect mode when
 *  nothing is selected. Tries the full document first (identical to the pre-budget behavior);
 *  only strips (headers/text/equations/symbolic equations only) or, failing that, truncates
 *  when the full dump is actually over budget — the common case is untouched. */
export function buildDocumentPageContext(
  visibleBlocks: Block[],
  allBlocksForRefs: Block[],
  charBudget = PAGE_CONTEXT_CHAR_BUDGET,
): PageContextResult {
  const full = toContextLines(visibleBlocks, allBlocksForRefs);
  const fullText = full.map((l) => l.line).join("\n");
  if (fullText.length <= charBudget) return { text: fullText, reduced: false };

  const stripped = full.filter((l) => STRIPPED_CONTEXT_TYPES.has(l.block.type));
  const strippedText = stripped.map((l) => l.line).join("\n");
  const strippedNote =
    `[Note: this document is large, so only headers, text, and equations are included below — ` +
    `${full.length - stripped.length} other block(s) (sliders, plots, loops, images, dataset/CAD ` +
    `references, etc.) are omitted. If asked to summarize or review the whole document, say so ` +
    `rather than assuming this is everything.]`;
  if (strippedText.length <= charBudget) {
    return { text: `${strippedNote}\n${strippedText}`, reduced: true };
  }

  const { text: truncated, keptCount } = truncateLinesToBudget(stripped.map((l) => l.line), charBudget - strippedNote.length - 1);
  const truncatedNote =
    `[Note: this document is very large — showing only the first ${keptCount} of ${full.length} ` +
    `content blocks (headers/text/equations), truncated to fit. If asked to summarize or review ` +
    `the whole document, say so rather than assuming this is everything.]`;
  return { text: `${truncatedNote}\n${truncated}`, reduced: true };
}

/** Builds the AI chat's page-context dump for Inspect mode with a block selected. Tries the
 *  full document first, same as buildDocumentPageContext; only windows around the selection
 *  when actually over budget. Falls back to the generic ladder if the selection can't be found
 *  (stale/deleted id) — there's no anchor to window around. */
export function buildSelectedBlockWindowContext(
  visibleBlocks: Block[],
  allBlocksForRefs: Block[],
  selectedBlockId: string,
  windowRadius = INSPECT_WINDOW_RADIUS,
  charBudget = PAGE_CONTEXT_CHAR_BUDGET,
): PageContextResult {
  const full = toContextLines(visibleBlocks, allBlocksForRefs);
  const fullText = full.map((l) => l.line).join("\n");
  if (fullText.length <= charBudget) return { text: fullText, reduced: false };

  const selIdx = visibleBlocks.findIndex((b) => b.id === selectedBlockId);
  if (selIdx === -1) {
    return buildDocumentPageContext(visibleBlocks, allBlocksForRefs, charBudget);
  }

  const lo = Math.max(0, selIdx - windowRadius);
  const hi = Math.min(visibleBlocks.length - 1, selIdx + windowRadius);
  const windowLines = full.filter((l) => l.position - 1 >= lo && l.position - 1 <= hi);
  const windowText = windowLines.map((l) => l.line).join("\n");
  const windowNote =
    `[Note: this document is large — showing only the ${hi - lo + 1} blocks immediately around ` +
    `the selected block (positions ${lo + 1}–${hi + 1} of ${visibleBlocks.length}), not the full ` +
    `document. If asked to summarize or review the whole document, say so rather than assuming ` +
    `this is everything.]`;
  if (windowText.length <= charBudget) {
    return { text: `${windowNote}\n${windowText}`, reduced: true };
  }

  const { text: truncated, keptCount } = truncateLinesToBudget(windowLines.map((l) => l.line), charBudget - windowNote.length - 1);
  const truncatedNote =
    `[Note: this document is large, and even the ${windowLines.length} blocks around the ` +
    `selected block don't fit — showing only the first ${keptCount} of those. If asked to ` +
    `summarize or review the whole document, say so rather than assuming this is everything.]`;
  return { text: `${truncatedNote}\n${truncated}`, reduced: true };
}
