import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";
import { checkPermission } from "@/utils/checkPermission";

const LOCK_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours

// POST /api/file/[id]/checkout — lock a Document or Dataset for editing
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { userId } = await getSessionUser();
  const fileId = Number(id);

  const canEdit = await checkPermission(fileId, userId, "edit");
  if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const file = await db.file.findUnique({
    where: { id: fileId },
    select: { id: true, fileTypeId: true, lockedBy: true, lockedAt: true },
  });
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only Documents and Datasets support checkout
  const checkoutTypes = ["Document", "Dataset"];
  if (!checkoutTypes.includes(file.fileTypeId)) {
    return NextResponse.json({ error: "Checkout is only available for Documents and Datasets" }, { status: 400 });
  }

  // Check if lock is held by another user
  if (file.lockedBy !== null && file.lockedBy !== userId) {
    const isStale = file.lockedAt && Date.now() - file.lockedAt.getTime() > LOCK_TIMEOUT_MS;
    if (!isStale) {
      // Return locker's name for the UI
      const locker = await db.user.findUnique({ where: { id: file.lockedBy }, select: { name: true } });
      return NextResponse.json(
        { error: "File is checked out", lockedBy: file.lockedBy, lockedByName: locker?.name ?? "another user", lockedAt: file.lockedAt?.toISOString() },
        { status: 409 },
      );
    }
    // Stale lock — auto-release and fall through to checkout
  }

  const now = new Date();
  await db.file.update({
    where: { id: fileId },
    data: { lockedBy: userId, lockedAt: now },
  });

  return NextResponse.json({ lockedBy: userId, lockedAt: now.toISOString() });
}
