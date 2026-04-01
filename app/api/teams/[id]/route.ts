import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";

// GET /api/teams/[id] — team details + members with user info
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { userId } = await getSessionUser();

  const team = await db.team.findUnique({
    where: { id: Number(id) },
    include: { members: true },
  });
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isMember = team.members.some((m) => m.userId === userId);
  if (!isMember && team.ownerId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Attach user info to each member
  const memberUserIds = team.members.map((m) => m.userId);
  const users = await db.user.findMany({
    where: { id: { in: memberUserIds } },
    select: { id: true, name: true, email: true, username: true },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  return NextResponse.json({
    ...team,
    members: team.members.map((m) => ({ ...m, user: userMap[m.userId] })),
  });
}

// PATCH /api/teams/[id] — edit team name/description (owner only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { userId } = await getSessionUser();
  const { name, description } = await req.json() as { name?: string; description?: string };

  const team = await db.team.findUnique({ where: { id: Number(id) }, select: { ownerId: true } });
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (team.ownerId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updated = await db.team.update({
    where: { id: Number(id) },
    data: { ...(name !== undefined && { name }), ...(description !== undefined && { description }) },
    include: { members: true },
  });

  return NextResponse.json(updated);
}

// DELETE /api/teams/[id] — delete team (owner only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { userId } = await getSessionUser();

  const team = await db.team.findUnique({ where: { id: Number(id) }, select: { ownerId: true } });
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (team.ownerId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.team.delete({ where: { id: Number(id) } });
  return NextResponse.json({ deleted: true });
}
