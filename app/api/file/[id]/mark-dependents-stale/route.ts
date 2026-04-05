import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";
import { checkPermission } from "@/utils/checkPermission";

// POST /api/file/[id]/mark-dependents-stale
// Called after a document save to flag all files that import from this one as needing an update.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { userId } = await getSessionUser();
  const fileId = Number(id);

  const canEdit = await checkPermission(fileId, userId, "edit");
  if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Find all files that import from this one — new system (file_imports) and
  // old system (component content JSON with inputFile pointing to this file).
  const like1 = `%"inputFile":${fileId}%`;
  const like2 = `%"inputFile":"${fileId}"%`;
  const rows = await db.$queryRaw<Array<{ file_id: number }>>`
    SELECT DISTINCT file_id FROM file_imports WHERE source_file_id = ${fileId}
    UNION
    SELECT DISTINCT file_id FROM components
    WHERE deleted_at IS NULL AND file_id != ${fileId}
      AND (content LIKE ${like1} OR content LIKE ${like2})
  `;

  const dependentFileIds = rows.map((r) => Number(r.file_id));

  if (dependentFileIds.length > 0) {
    await db.file.updateMany({ where: { id: { in: dependentFileIds } }, data: { needsUpdate: true } });
  }

  return NextResponse.json({ markedStale: dependentFileIds.length });
}
