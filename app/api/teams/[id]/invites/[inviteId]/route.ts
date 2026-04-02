import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; inviteId: string }> },
) {
  const session = await getSessionUser();
  const { id, inviteId } = await params;
  const teamId = parseInt(id);
  const invId = parseInt(inviteId);

  const team = await db.team.findUnique({
    where: { id: teamId },
    include: { members: true },
  });
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = team.ownerId === session.userId;
  const isAdmin = isOwner || team.members.some((m) => m.userId === session.userId && m.role === "admin");
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.orgInvite.deleteMany({ where: { id: invId, teamId } });

  return NextResponse.json({ ok: true });
}
