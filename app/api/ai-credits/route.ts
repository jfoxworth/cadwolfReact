import { NextResponse } from "next/server";
import { getSessionUser } from "@/utils/getSessionUser";
import { db } from "@/utils/db";
import { getBalanceCredits, resolveAccount } from "@/utils/aiCredits";

// GET /api/ai-credits — the credits the signed-in user can spend, in credits: their own, plus the
// shared credits of each team they belong to. `account` is the team charged now (null = their own)
// and `balance` is that account's balance.
export async function GET() {
  const { userId } = await getSessionUser();
  const account = await resolveAccount(userId);

  const memberships = await db.teamMember.findMany({
    where: { userId },
    include: { team: { select: { id: true, name: true } } },
    orderBy: { teamId: "asc" },
  });
  const accounts = await Promise.all([
    getBalanceCredits({ userId, teamId: null }).then((balance) => ({ teamId: null as number | null, name: "Personal", balance })),
    ...memberships.map((m) =>
      getBalanceCredits({ userId, teamId: m.teamId }).then((balance) => ({ teamId: m.teamId as number | null, name: m.team.name, balance })),
    ),
  ]);
  const active = accounts.find((a) => a.teamId === account.teamId) ?? accounts[0];

  return NextResponse.json({ account: active.teamId, balance: active.balance, accounts });
}
