import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";
import { checkPermission } from "@/utils/checkPermission";
import { componentToBlock } from "@/utils/transformers";

// GET /api/file/[id]/solve-data — returns blocks + file imports for client-side solving
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { userId } = await getSessionUser();
  const fileId = Number(id);

  const canEdit = await checkPermission(fileId, userId, "edit");
  if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [components, fileImports] = await Promise.all([
    db.component.findMany({
      where: { fileId, inEdit: 1, deletedAt: null },
      orderBy: { order: "asc" },
    }),
    db.fileImport.findMany({
      where: { fileId },
      select: { id: true, localAlias: true, sourceVariableName: true, value: true, units: true },
    }),
  ]);

  // Exclude old-style import components (those with inputFile pointing to a different file).
  // They are represented as fileImports entries and must not be treated as regular blocks.
  const regularComponents = components.filter((c) => {
    let raw: Record<string, unknown> = {};
    try { raw = JSON.parse(c.content ?? "{}"); } catch { /* ignore */ }
    const inputFile = raw.inputFile;
    const sourceFileId = inputFile && inputFile !== "0" && inputFile !== 0 ? Number(inputFile) : null;
    return !(sourceFileId && sourceFileId !== fileId);
  });

  return NextResponse.json({ blocks: regularComponents.map(componentToBlock), fileImports });
}
