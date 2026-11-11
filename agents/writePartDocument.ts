// Saves a part agent's finished document as the part's real content. Written straight through
// Prisma like the design documents. A part document the user wrote or edited is never replaced:
// only an empty one, or one this agent wrote earlier (marked aiBuilt in itemData), is.
import { db } from "@/utils/db";
import { blockContent, type DesignBlock } from "./writeDesignDocument";

export interface PartImportRow {
  sourceFileId: number;
  sourceFileName: string;
  sourceVariableName: string;
  localAlias: string;
  value: number;
  units: string | null;
}

function parseItemData(itemData: string | null): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(itemData || "{}");
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Whether the agent may write into this part: empty, or built by an agent before. */
export async function partDocumentIsWritable(fileId: number): Promise<boolean> {
  const [file, count] = await Promise.all([
    db.file.findUnique({ where: { id: fileId }, select: { itemData: true } }),
    db.component.count({ where: { fileId, deletedAt: null } }),
  ]);
  return count === 0 || parseItemData(file?.itemData ?? null).aiBuilt === true;
}

export async function writePartDocument(args: {
  fileId: number;
  blocks: DesignBlock[];
  imports: PartImportRow[];
}): Promise<void> {
  const { fileId, blocks, imports } = args;
  const now = new Date();
  await db.$transaction(async (tx) => {
    const file = await tx.file.findUnique({ where: { id: fileId }, select: { itemData: true } });
    await tx.component.updateMany({ where: { fileId, deletedAt: null }, data: { deletedAt: now } });
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
    await tx.fileImport.deleteMany({ where: { fileId } });
    if (imports.length) {
      await tx.fileImport.createMany({
        data: imports.map((imp, order) => ({
          fileId,
          sourceFileId: imp.sourceFileId,
          sourceFileName: imp.sourceFileName,
          sourceVariableName: imp.sourceVariableName,
          localAlias: imp.localAlias,
          value: String(imp.value),
          units: imp.units,
          needsUpdate: false,
          order,
          createdAt: now,
          updatedAt: now,
        })),
      });
    }
    await tx.file.update({
      where: { id: fileId },
      data: { itemData: JSON.stringify({ ...parseItemData(file?.itemData ?? null), aiBuilt: true }), updatedAt: now },
    });
  });
}
