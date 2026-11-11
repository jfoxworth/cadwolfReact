// Process step 3: the coordinator reads the requirements document(s) in full. The whole text
// informs the structure; blocks the user flagged as requirements (text / equation /
// symbolic-equation blocks with isRequirement) are also returned separately, so they can be
// copied into the design document exactly as they were and cited by id.
import { db } from "@/utils/db";
import { checkPermission } from "@/utils/checkPermission";
import { blockToContextLine } from "@/utils/blockToText";
import { componentToBlock } from "@/utils/transformers";
import type { Item } from "@/types/item";
import { htmlToText } from "./htmlToText";

export type RequirementKind = "text" | "equation" | "symbolic_equation";

export interface Requirement {
  /** Component id — the "id of the source block" the design document records. */
  componentId: number;
  fileId: number;
  fileName: string;
  kind: RequirementKind;
  /** The block's saved content JSON, kept so the design document can copy it as it was. */
  content: Record<string, unknown>;
  /** One-line plain-text form for the model. */
  summary: string;
}

export interface RequirementsDocumentText {
  fileId: number;
  fileName: string;
  /** The whole document as plain text, one line per block. Flagged requirements are prefixed
   *  with `[requirement <id>]`. */
  text: string;
}

/** A requirements document larger than this is refused, not cut: a design built from half a
 *  document would look complete and not be. Roughly 75k tokens. */
export const MAX_REQUIREMENTS_DOCUMENT_CHARS = 300_000;

const KIND_BY_COMPONENT_TYPE: Record<number, RequirementKind> = {
  1: "text",
  3: "equation",
  4: "symbolic_equation",
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function parseContent(content: string | null): Record<string, unknown> {
  if (!content) return {};
  try {
    const parsed: unknown = JSON.parse(content);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function summarize(kind: RequirementKind, content: Record<string, unknown>): string {
  if (kind === "equation") return String(content.raw ?? "").trim();
  if (kind === "symbolic_equation") return String(content.expression ?? "").trim();
  return stripHtml(String(content.text ?? ""));
}

/** Reads the given items in full. Callers pass the items they want read: the main coordinator
 *  passes the requirements documents directly under the part tree, a system coordinator passes
 *  the ones in its own system. Only Documents with isAnalysis, that the user can view, count. */
export async function gatherRequirements(
  items: Item[],
  userId: number,
): Promise<{
  documents: RequirementsDocumentText[];
  requirements: Requirement[];
  documentCount: number;
}> {
  const candidates = items.filter((i) => i.type === "DOCUMENT" && i.isAnalysis === true);
  const documentIds: number[] = [];
  for (const item of candidates) {
    if (await checkPermission(Number(item.id), userId, "view")) documentIds.push(Number(item.id));
  }
  if (documentIds.length === 0) return { documents: [], requirements: [], documentCount: 0 };

  const [components, files] = await Promise.all([
    db.component.findMany({
      where: { fileId: { in: documentIds }, deletedAt: null },
      orderBy: [{ fileId: "asc" }, { order: "asc" }],
    }),
    db.file.findMany({ where: { id: { in: documentIds } }, select: { id: true, name: true } }),
  ]);
  const nameById = new Map(files.map((f) => [f.id, f.name]));

  const documents: RequirementsDocumentText[] = [];
  const requirements: Requirement[] = [];

  for (const fileId of documentIds) {
    const fileName = nameById.get(fileId) ?? `File ${fileId}`;
    const own = components.filter((c) => c.fileId === fileId);
    const blocks = own.map(componentToBlock);

    const lines: string[] = [];
    own.forEach((c, i) => {
      const block = blocks[i];
      const raw = blockToContextLine(block, blocks);
      if (!raw) return;
      const line = block.type === "TEXT" ? htmlToText(raw) : raw;
      if (!line) return;

      const kind = KIND_BY_COMPONENT_TYPE[c.componentTypeId];
      if (c.isRequirement && kind) {
        const content = parseContent(c.content);
        const summary = summarize(kind, content);
        if (summary) {
          requirements.push({ componentId: c.id, fileId, fileName, kind, content, summary });
          lines.push(`[requirement ${c.id}] ${line}`);
          return;
        }
      }
      lines.push(line);
    });

    const text = lines.join("\n");
    if (text.length > MAX_REQUIREMENTS_DOCUMENT_CHARS) {
      throw new Error(
        `The requirements document "${fileName}" is too large to read in one pass (${text.length.toLocaleString()} characters; the limit is ${MAX_REQUIREMENTS_DOCUMENT_CHARS.toLocaleString()}). Split it into smaller documents.`,
      );
    }
    documents.push({ fileId, fileName, text });
  }

  return { documents, requirements, documentCount: documentIds.length };
}
