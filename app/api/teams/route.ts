import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";

// GET /api/teams — teams the user owns or is a member of
export async function GET() {
  const { userId } = await getSessionUser();

  const [owned, memberships] = await Promise.all([
    db.team.findMany({ where: { ownerId: userId }, include: { members: true } }),
    db.teamMember.findMany({ where: { userId }, include: { team: { include: { members: true } } } }),
  ]);

  const memberTeams = memberships.map((m) => m.team);
  const ownedIds = new Set(owned.map((t) => t.id));
  const allTeams = [...owned, ...memberTeams.filter((t) => !ownedIds.has(t.id))];

  return NextResponse.json(allTeams);
}

// POST /api/teams — create a team
export async function POST(req: NextRequest) {
  const { userId } = await getSessionUser();
  const { name, description = "" } = await req.json() as { name: string; description?: string };

  const team = await db.team.create({
    data: { name, description, ownerId: userId, members: { create: { userId, role: "admin" } } },
    include: { members: true },
  });

  return NextResponse.json(team, { status: 201 });
}
