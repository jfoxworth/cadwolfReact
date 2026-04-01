import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";

// POST /api/teams/[id]/members — add a member by email
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { userId } = await getSessionUser();
  const { email, role = "member" } = await req.json() as { email: string; role?: string };

  const team = await db.team.findUnique({ where: { id: Number(id) }, select: { ownerId: true } });
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only team admins/owner can add members
  const isAdmin = team.ownerId === userId || !!(await db.teamMember.findFirst({
    where: { teamId: Number(id), userId, role: "admin" },
  }));
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const targetUser = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const member = await db.teamMember.upsert({
    where: { teamId_userId: { teamId: Number(id), userId: targetUser.id } },
    update: { role },
    create: { teamId: Number(id), userId: targetUser.id, role },
  });

  return NextResponse.json(member, { status: 201 });
}
