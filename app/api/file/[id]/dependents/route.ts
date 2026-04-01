import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";
import { checkPermission } from "@/utils/checkPermission";

// GET /api/file/[id]/dependents
// Returns a list of files that import variables from this file,
// grouped by the dependent file, with the variables they import.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { userId } = await getSessionUser();
  const sourceFileId = Number(id);

  const canView = await checkPermission(sourceFileId, userId, "view");
  if (!canView) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await db.fileImport.findMany({
    where: { sourceFileId },
    select: {
      fileId:             true,
      sourceVariableName: true,
      localAlias:         true,
      file: { select: { name: true } },
    },
    orderBy: { fileId: "asc" },
  });

  // Group by fileId
  const map = new Map<number, { fileId: number; fileName: string; variables: { sourceVariableName: string; localAlias: string }[] }>();
  for (const row of rows) {
    if (!map.has(row.fileId)) {
      map.set(row.fileId, {
        fileId:    row.fileId,
        fileName:  row.file.name,
        variables: [],
      });
    }
    map.get(row.fileId)!.variables.push({
      sourceVariableName: row.sourceVariableName,
      localAlias:         row.localAlias,
    });
  }

  return NextResponse.json([...map.values()]);
}
