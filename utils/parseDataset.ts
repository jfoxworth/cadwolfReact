import type { DatasetParser } from "@/types/dataset";

export type NestedStringArray = string | NestedStringArray[];

/** Convert user-visible escape sequences to actual characters. */
export function realSeparator(sep: string): string {
  return sep
    .replace(/\\n\\n/g, "\n\n")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\r/g, "\r");
}

/** Display actual characters as user-visible escape sequences. */
export function displaySeparator(sep: string): string {
  return sep
    .replace(/\n\n/g, "\\n\\n")
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t")
    .replace(/\r/g, "\\r");
}

/**
 * Recursively split text using parsers in reverse order.
 * parsers[last] is the outermost separator (rows/blocks),
 * parsers[0] is the innermost separator (individual values).
 */
function parseRecursive(
  text: string,
  parsers: DatasetParser[],
  depth: number,
): NestedStringArray {
  if (depth >= parsers.length) return text;
  const parserIndex = parsers.length - 1 - depth;
  const sep = realSeparator(parsers[parserIndex].separator);
  const parts = text.split(sep).filter((p) => p.trim() !== "");
  return parts.map((part) => parseRecursive(part, parsers, depth + 1));
}

export function parseDataset(
  rawText: string,
  parsers: DatasetParser[],
): NestedStringArray {
  if (!rawText.trim() || parsers.length === 0) return rawText;
  return parseRecursive(rawText, parsers, 0);
}

/** Get the maximum length at a given nesting depth. */
function sizeAtDepth(node: NestedStringArray, depth: number): number {
  if (depth === 0) return Array.isArray(node) ? node.length : 1;
  if (!Array.isArray(node)) return 1;
  return Math.max(0, ...node.map((child) => sizeAtDepth(child, depth - 1)));
}

/** Returns a size string like "3 x 4" or "3 x 4 x 2". */
export function computeSizeString(
  parsed: NestedStringArray,
  numParsers: number,
): string {
  const dims: number[] = [];
  for (let d = 0; d < numParsers; d++) {
    dims.push(sizeAtDepth(parsed, d));
  }
  return dims.join(" × ");
}

/**
 * Navigate into the parsed result using dimension selectors for dimensions 2+,
 * then return a 2D string array suitable for table rendering.
 *
 * dimSelectors[i] selects the index along dimension i+2.
 */
export function sliceTo2D(
  parsed: NestedStringArray,
  numParsers: number,
  dimSelectors: number[],
): string[][] {
  if (numParsers === 0) {
    return [[String(parsed)]];
  }

  // Navigate through extra dimensions (dim 2+) using selectors
  let node: NestedStringArray = parsed;
  const extraDims = Math.max(0, numParsers - 2);
  for (let i = 0; i < extraDims; i++) {
    if (!Array.isArray(node)) return [[""]];
    const idx = Math.min(dimSelectors[i] ?? 0, (node as NestedStringArray[]).length - 1);
    node = (node as NestedStringArray[])[Math.max(0, idx)];
  }

  // node is now a 2D structure (or 1D or scalar)
  if (!Array.isArray(node)) return [[String(node)]];

  return (node as NestedStringArray[]).map((row) => {
    if (!Array.isArray(row)) return [String(row)];
    return (row as NestedStringArray[]).map((cell) =>
      Array.isArray(cell) ? JSON.stringify(cell) : String(cell),
    );
  });
}

/** How many items exist at a given extra-dimension level, given prior selections. */
export function sizeAtExtraDim(
  parsed: NestedStringArray,
  dimIndex: number,
  priorSelectors: number[],
): number {
  let node: NestedStringArray = parsed;
  for (let i = 0; i < dimIndex; i++) {
    if (!Array.isArray(node)) return 0;
    node = (node as NestedStringArray[])[priorSelectors[i] ?? 0];
  }
  return Array.isArray(node) ? (node as NestedStringArray[]).length : 0;
}
