import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/utils/getSessionUser";
import { db } from "@/utils/db";
import { dollarsToUnits, CREDITS_PER_DOLLAR } from "@/utils/aiCredits";

// POST /api/ai-credits/limits { teamId, userId, monthlyCredits } — sets one team member's monthly cap on the
// team's shared AI credits. monthlyCredits null (or empty) removes the cap. Team owner or admin only.
export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  const { teamId, userId, monthlyCredits } = await req.json() as {
    teamId?: number; userId?: number; monthlyCredits?: number | null;
  };
  if (!Number.isInteger(teamId) || !Number.isInteger(userId)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const team = await db.team.findUnique({
    where: { id: teamId! },
    include: { members: { select: { userId: true, role: true } } },
  });
  const myRole = team?.ownerId === session.userId ? "owner" : team?.members.find((m) => m.userId === session.userId)?.role;
  if (!team || (myRole !== "owner" && myRole !== "admin")) {
    return NextResponse.json({ error: "Only a team owner or admin can set limits" }, { status: 403 });
  }
  if (!team.members.some((m) => m.userId === userId)) {
    return NextResponse.json({ error: "That person is not on the team" }, { status: 404 });
  }

  if (monthlyCredits === null || monthlyCredits === undefined) {
    await db.teamAiLimit.deleteMany({ where: { teamId: teamId!, userId: userId! } });
    return NextResponse.json({ ok: true, monthlyCredits: null });
  }
  if (typeof monthlyCredits !== "number" || !Number.isFinite(monthlyCredits) || monthlyCredits < 0) {
    return NextResponse.json({ error: "Limit must be zero or more credits" }, { status: 400 });
  }
  const monthlyUnits = dollarsToUnits(monthlyCredits / CREDITS_PER_DOLLAR);
  await db.teamAiLimit.upsert({
    where: { teamId_userId: { teamId: teamId!, userId: userId! } },
    create: { teamId: teamId!, userId: userId!, monthlyUnits },
    update: { monthlyUnits },
  });
  return NextResponse.json({ ok: true, monthlyCredits });
}
