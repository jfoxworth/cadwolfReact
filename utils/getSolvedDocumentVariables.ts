import { db } from "./db";
import { componentToBlock } from "./transformers";

export interface SolvedVariable {
  name: string;
  raw: string;
  value?: number;
  units?: string;
}

/** Reads one document's solved EQUATION blocks for use as "available requirements" context
 *  when generating another document's content — only variables with a real solved scalar are
 *  included (an unsolved/errored equation has nothing a part could meaningfully import).
 *  Callers are responsible for their own permission check before calling this (see
 *  app/api/part-tree/generate-document) — it does no access control itself. */
export async function getSolvedDocumentVariables(fileId: number): Promise<{ name: string; variables: SolvedVariable[] }> {
  const file = await db.file.findUnique({ where: { id: fileId }, select: { name: true } });
  const components = await db.component.findMany({ where: { fileId }, orderBy: { order: "asc" } });

  const variables: SolvedVariable[] = [];
  for (const component of components) {
    const block = componentToBlock(component);
    if (block.type !== "EQUATION") continue;

    const raw = (block.definition.raw as string | undefined) ?? "";
    const name = raw.split("=")[0]?.trim();
    if (!name) continue;

    const solution = block.solution as { real?: Record<string, number>; units?: string } | undefined;
    const value = solution?.real?.["0-0"];
    if (value === undefined) continue; // unsolved/errored — nothing usable to import

    variables.push({ name, raw, value, units: solution?.units });
  }

  return { name: file?.name ?? "", variables };
}
