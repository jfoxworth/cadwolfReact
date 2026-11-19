import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/utils/getSessionUser";
import { db } from "@/utils/db";
import { resolveAccount } from "@/utils/aiCredits";

// POST /api/ai-credits/account { teamId } — saves which credits pay for the user's AI use: a team
// they belong to, or null for their own.
export async function POST(req: NextRequest) {
  const { userId } = await getSessionUser();
  const { teamId } = await req.json() as { teamId?: number | null };
  const requested = typeof teamId === "number" && Number.isInteger(teamId) ? teamId : null;

  const account = await resolveAccount(userId, requested);
  if (requested !== null && account.teamId !== requested) {
    return NextResponse.json({ error: "You are not a member of that team" }, { status: 403 });
  }
  await db.user.update({ where: { id: userId }, data: { aiAccountTeamId: account.teamId } });
  return NextResponse.json({ ok: true, account: account.teamId });
}
