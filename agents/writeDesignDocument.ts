// Creates or overwrites a design document: an ordinary Document in the app's normal block
// format, marked in itemData (see designDocument.ts). Written straight through Prisma rather
// than the /api/file and /api/component routes on purpose — those routes fire the embedding
// hooks, and design documents must never be vectorized.
import { nanoid } from "nanoid";
import { db } from "@/utils/db";
import { rawToLatex } from "@/utils/rawToLatex";
import { BLOCK_TYPE_TO_COMPONENT_ID } from "@/utils/transformers";
import { getDesignFor, markAsDesignDocument } from "./designDocument";

/** Design documents must stay small (process doc). Enforced here as well as in the prompt. */
export const MAX_DESIGN_BLOCKS = 300;
export const MAX_TEXT_CHARS = 4000;

/** Where a copied requirement came from. Stored in the block so it can be read back. */
export interface DesignBlockSource {
  id: number;
  file: string;
}

export type DesignBlock =
  | { type: "header"; text: string; level: 1 | 2 | 3 | 4 }
  | { type: "text"; html: string; source?: DesignBlockSource }
  /** `content` is a saved equation block's content (raw, displayEq, solution), copied as it was. */
  | { type: "equation"; content: Record<string, unknown>; source?: DesignBlockSource }
  | { type: "symbolic_equation"; expression: string; source?: DesignBlockSource };

function sourceFields(source: DesignBlockSource | undefined): Record<string, unknown> {
  return source ? { sourceRequirementId: source.id, sourceFileName: source.file } : {};
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Plain text (from the model) → paragraphs of safe HTML, capped at MAX_TEXT_CHARS. */
export function textToHtml(text: string): string {
  const capped = text.length > MAX_TEXT_CHARS ? `${text.slice(0, MAX_TEXT_CHARS)}…` : text;
  return capped
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function blockContent(block: DesignBlock): { componentTypeId: number; content: string } {
  switch (block.type) {
    case "header":
      return {
        componentTypeId: BLOCK_TYPE_TO_COMPONENT_ID.HEADER,
        content: JSON.stringify({ _v2: true, text: block.text, level: block.level, width: "full" }),
      };
    case "text":
      return {
        componentTypeId: BLOCK_TYPE_TO_COMPONENT_ID.TEXT,
        content: JSON.stringify({ _v2: true, text: block.html, width: "full", ...sourceFields(block.source) }),
      };
    case "symbolic_equation":
      return {
        componentTypeId: BLOCK_TYPE_TO_COMPONENT_ID.SYMBOLIC_EQUATION,
        content: JSON.stringify({ _v2: true, expression: block.expression, width: "full", ...sourceFields(block.source) }),
      };
    case "equation": {
      const raw = String(block.content.raw ?? "");
      return {
        componentTypeId: BLOCK_TYPE_TO_COMPONENT_ID.EQUATION,
        content: JSON.stringify({
          _v2: true,
          raw,
          displayEq: typeof block.content.displayEq === "string" ? block.content.displayEq : rawToLatex(raw),
          width: "full",
          ...sourceFields(block.source),
          // Kept so the copy shows the same result the requirement had. isRequirement is
          // deliberately NOT copied: a design document's copy is a record, and must never be
          // picked up as a requirement itself.
          ...(block.content.solution ? { solution: block.content.solution } : {}),
        }),
      };
    }
  }
}

/** Writes `blocks` as the design document for `designFor`, replacing the previous one if this
 *  step is being re-run. The document lives under `parentId`. Returns its file id. */
export async function writeDesignDocument(args: {
  userId: number;
  parentId: number;
  designFor: number;
  name: string;
  blocks: DesignBlock[];
}): Promise<{ fileId: number; slug: string; replaced: boolean }> {
  const { userId, parentId, designFor, name } = args;
  const blocks = args.blocks.slice(0, MAX_DESIGN_BLOCKS);

  return db.$transaction(async (tx) => {
    const siblings = await tx.file.findMany({
      where: { parentId, deletedAt: null, fileTypeId: "Document" },
      select: { id: true, slug: true, itemData: true },
    });
    const existing = siblings.find((s) => getDesignFor(s.itemData) === designFor);
    const now = new Date();

    let fileId: number;
    let slug: string;
    if (existing) {
      fileId = existing.id;
      slug = existing.slug;
      await tx.component.updateMany({ where: { fileId, deletedAt: null }, data: { deletedAt: now } });
      await tx.file.update({ where: { id: fileId }, data: { name, updatedAt: now } });
    } else {
      const file = await tx.file.create({
        data: {
          fileTypeId: "Document",
          name,
          parentId,
          userId,
          order: siblings.length,
          slug: nanoid(10),
          itemData: markAsDesignDocument("{}", designFor),
          lft: 0,
          rgt: 0,
          // Set explicitly: the columns have no database default, and a NULL date is shown
          // to the user as "now".
          createdAt: now,
          updatedAt: now,
        },
      });
      fileId = file.id;
      slug = file.slug;
    }

    await tx.component.createMany({
      data: blocks.map((block, index) => ({
        fileId,
        order: index,
        itemid: crypto.randomUUID(),
        inEdit: 1,
        isRequirement: false,
        createdAt: now,
        updatedAt: now,
        ...blockContent(block),
      })),
    });

    return { fileId, slug, replaced: Boolean(existing) };
  });
}
