// Design documents (see PART_TREE_BUILD_PROCESS.md, "Design documents"): ordinary documents the
// AI writes to record how it is designing a system or part. They are marked by two properties in
// the file's itemData JSON:
//
//   isDesignDocument: true   — set on every design document
//   designFor: <fileId>      — the system or part this document designs
//
// Any code that embeds, lists or deletes files must call isDesignDocument() so these are never
// vectorized, shown as ordinary content, or deleted along with the thing they describe by
// accident. Those call sites are not wired yet — see the Status table in the process doc.

export interface DesignDocumentMeta {
  isDesignDocument: true;
  designFor: number;
}

function parseItemData(itemData: string | null | undefined): Record<string, unknown> {
  if (!itemData) return {};
  try {
    const parsed: unknown = JSON.parse(itemData);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/** True when a File's itemData marks it as a design document. */
export function isDesignDocument(itemData: string | null | undefined): boolean {
  return parseItemData(itemData).isDesignDocument === true;
}

/** The file id this design document designs, or null if itemData isn't a design document's. */
export function getDesignFor(itemData: string | null | undefined): number | null {
  const data = parseItemData(itemData);
  return data.isDesignDocument === true && typeof data.designFor === "number" ? data.designFor : null;
}

/** itemData JSON for a design document, preserving any properties the file already has. */
export function markAsDesignDocument(
  existingItemData: string | null | undefined,
  designFor: number,
): string {
  const meta: DesignDocumentMeta = { isDesignDocument: true, designFor };
  return JSON.stringify({ ...parseItemData(existingItemData), ...meta });
}
