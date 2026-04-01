import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";
import { checkPermission } from "@/utils/checkPermission";

// POST /api/file/[id]/checkin — release lock, bump version, save snapshot
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { userId } = await getSessionUser();
  const fileId = Number(id);

  const file = await db.file.findUnique({
    where: { id: fileId },
    select: { id: true, lockedBy: true, version: true },
  });
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Must be the lock holder or an admin
  if (file.lockedBy !== userId) {
    const isAdmin = await checkPermission(fileId, userId, "admin");
    if (!isAdmin) return NextResponse.json({ error: "You do not hold the checkout for this file" }, { status: 403 });
  }

  const newVersion = (file.version ?? 1) + 1;

  // Snapshot all current non-deleted components
  const components = await db.component.findMany({
    where: { fileId, deletedAt: null },
    select: { id: true, itemid: true, componentTypeId: true, content: true, order: true, name: true },
    orderBy: { order: "asc" },
  });

  await db.$transaction([
    db.fileVersion.create({
      data: {
        fileId,
        version: file.version ?? 1,
        snapshotData: JSON.stringify(components),
        createdBy: userId,
      },
    }),
    db.file.update({
      where: { id: fileId },
      data: { version: newVersion, lockedBy: null, lockedAt: null },
    }),
  ]);

  return NextResponse.json({ version: newVersion });
}
