import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";

// DELETE /api/teams/[id]/members/[userId] — remove a member
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const { id, userId: targetUserIdStr } = await params;
  const { userId } = await getSessionUser();
  const targetUserId = Number(targetUserIdStr);

  const team = await db.team.findUnique({ where: { id: Number(id) }, select: { ownerId: true } });
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAdmin = team.ownerId === userId || !!(await db.teamMember.findFirst({
    where: { teamId: Number(id), userId, role: "admin" },
  }));
  // Users can also remove themselves
  if (!isAdmin && userId !== targetUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.teamMember.delete({
    where: { teamId_userId: { teamId: Number(id), userId: targetUserId } },
  });

  return NextResponse.json({ removed: true });
}
