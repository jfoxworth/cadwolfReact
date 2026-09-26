import { db } from "./db";
import { checkPermission } from "./checkPermission";
import { componentToBlock } from "./transformers";
import { blockToContextLine } from "./blockToText";

/** Fetches a specific document's actual content (equations/text, via the same
 *  componentToBlock -> blockToContextLine pipeline utils/embedComponent.ts uses for
 *  embeddings) plus what it declares importing from other documents. Backs the AI chat's
 *  `read_document` tool (app/api/chat/tools.ts) — mirrors utils/searchEmbeddings.ts's role for
 *  `search_documents`: never throws, always returns a string the model can relay directly,
 *  including for permission/not-found cases. */
export async function readDocumentForChat(fileId: number, userId: number): Promise<string> {
  const canView = await checkPermission(fileId, userId, "view");
  if (!canView) return "You don't have access to that document.";

  const file = await db.file.findUnique({ where: { id: fileId }, select: { name: true } });
  if (!file) return "That document doesn't exist (or was deleted).";

  const components = await db.component.findMany({ where: { fileId }, orderBy: { order: "asc" } });
  const contentLines = components
    .map((c) => blockToContextLine(componentToBlock(c)))
    .filter((line): line is string => Boolean(line));

  const imports = await db.fileImport.findMany({ where: { fileId } });
  const importLines = imports.map(
    (i) => `${i.localAlias} imports ${i.sourceVariableName} from "${i.sourceFileName}" (id ${i.sourceFileId})`,
  );

  return [
    `Document: "${file.name}" (id ${fileId})`,
    "",
    "Content:",
    contentLines.length ? contentLines.join("\n") : "(no content)",
    "",
    "Imports:",
    importLines.length ? importLines.join("\n") : "(none declared)",
  ].join("\n");
}
