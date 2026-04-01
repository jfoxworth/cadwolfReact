import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";
import { checkPermission } from "@/utils/checkPermission";

// GET /api/file/[id]/versions — list version history (pro tier only)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { userId } = await getSessionUser();
  const fileId = Number(id);

  const canView = await checkPermission(fileId, userId, "view");
  if (!canView) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Gate on pro tier
  const user = await db.user.findUnique({ where: { id: userId }, select: { tier: true } });
  if (user?.tier !== "pro") {
    return NextResponse.json({ error: "Version history requires a Pro account" }, { status: 403 });
  }

  const versions = await db.fileVersion.findMany({
    where: { fileId, partTreeId: null },
    orderBy: { version: "desc" },
    select: { id: true, version: true, createdBy: true, createdAt: true },
  });

  // Fetch creator names
  const userIds = [...new Set(versions.map((v) => v.createdBy))];
  const users = await db.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u.name]));

  return NextResponse.json(
    versions.map((v) => ({
      id: v.id,
      version: v.version,
      createdBy: v.createdBy,
      createdByName: userMap.get(v.createdBy) ?? "Unknown",
      createdAt: v.createdAt.toISOString(),
    })),
  );
}
