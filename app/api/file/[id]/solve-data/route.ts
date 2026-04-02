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

  return NextResponse.json({ blocks: components.map(componentToBlock), fileImports });
}
