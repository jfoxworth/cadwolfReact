import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";
import { checkPermission } from "@/utils/checkPermission";

// GET /api/file/[id]/versions/[version] — get snapshot data for a specific version
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; version: string }> },
) {
  const { id, version } = await params;
  const { userId } = await getSessionUser();
  const fileId = Number(id);
  const versionNum = Number(version);

  const canView = await checkPermission(fileId, userId, "view");
  if (!canView) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Gate on pro tier
  const user = await db.user.findUnique({ where: { id: userId }, select: { tier: true } });
  if (user?.tier !== "pro") {
    return NextResponse.json({ error: "Version history requires a Pro account" }, { status: 403 });
  }

  const record = await db.fileVersion.findFirst({
    where: { fileId, version: versionNum, partTreeId: null },
    select: { snapshotData: true },
  });
  if (!record) return NextResponse.json({ error: "Version not found" }, { status: 404 });

  let blocks: unknown[] = [];
  try { blocks = JSON.parse(record.snapshotData); } catch { /* ignore */ }

  return NextResponse.json({ version: versionNum, blocks });
}
