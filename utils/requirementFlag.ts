// Component type ids that may be flagged as requirements: TEXT (1), EQUATION (3),
// SYMBOLIC_EQUATION (4) — see COMPONENT_TYPE_MAP in utils/transformers.ts.
const REQUIREMENT_COMPONENT_TYPE_IDS = new Set([1, 3, 4]);

/** Value for Component.isRequirement, derived from the block's saved content JSON so the
 *  queryable column can't drift from the flag the editor writes (definition.isRequirement). */
export function deriveIsRequirement(componentTypeId: number, content: unknown): boolean {
  if (!REQUIREMENT_COMPONENT_TYPE_IDS.has(componentTypeId)) return false;
  let parsed: unknown = content;
  if (typeof content === "string") {
    try { parsed = JSON.parse(content); } catch { return false; }
  }
  return typeof parsed === "object" && parsed !== null && (parsed as Record<string, unknown>).isRequirement === true;
}
