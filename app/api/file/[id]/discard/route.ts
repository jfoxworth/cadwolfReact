import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";
import { checkPermission } from "@/utils/checkPermission";

// POST /api/file/[id]/discard — release lock without saving or bumping version
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { userId } = await getSessionUser();
  const fileId = Number(id);

  const file = await db.file.findUnique({
    where: { id: fileId },
    select: { id: true, lockedBy: true },
  });
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (file.lockedBy !== userId) {
    const isAdmin = await checkPermission(fileId, userId, "admin");
    if (!isAdmin) return NextResponse.json({ error: "You do not hold the checkout for this file" }, { status: 403 });
  }

  await db.file.update({
    where: { id: fileId },
    data: { lockedBy: null, lockedAt: null },
  });

  return NextResponse.json({ ok: true });
}
