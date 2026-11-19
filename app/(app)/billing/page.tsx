import { redirect } from "next/navigation";
import { getSessionUser } from "@/utils/getSessionUser";
import { db } from "@/utils/db";
import BillingPageClient from "@/components/billing/BillingPageClient";
import { getBalanceCredits, getMemberMonthUnits, unitsToCredits } from "@/utils/aiCredits";
import { CREDIT_PACKS } from "@/utils/stripe";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; teamId?: string; credits?: string }>;
}) {
  const session = await getSessionUser();
  const params = await searchParams;

  const user = await db.user.findUniqueOrThrow({ where: { id: session.userId } });

  // Teams owned by this user that have a business subscription
  const ownedTeams = await db.team.findMany({
    where: { ownerId: session.userId },
    select: {
      id: true, name: true, tier: true, seatCount: true,
      storageUsed: true, storageQuota: true, stripeSubscriptionId: true,
    },
  });

  const [balance, purchases, usage] = await Promise.all([
    getBalanceCredits({ userId: session.userId, teamId: null }),
    db.aiCreditPurchase.findMany({ where: { userId: session.userId, teamId: null }, orderBy: { id: "desc" }, take: 10 }),
    db.aiUsageLog.findMany({ where: { userId: session.userId, teamId: null }, orderBy: { id: "desc" }, take: 15 }),
  ]);
  const creditsData = {
    balance,
    packs: CREDIT_PACKS.map((p) => ({ id: p.id, dollars: p.dollars })),
    purchases: purchases.map((p) => ({
      id: p.id, credits: unitsToCredits(p.units), source: p.source,
      description: p.description, createdAt: p.createdAt.toISOString(),
    })),
    usage: usage.map((u) => ({
      id: u.id, credits: unitsToCredits(u.costUnits), pageType: u.pageType, source: u.source,
      model: u.model, createdAt: u.createdAt.toISOString(),
    })),
  };

  // Shared AI credits of every team the user belongs to. Owners and admins can buy and set member limits.
  const memberships = await db.teamMember.findMany({
    where: { userId: session.userId },
    include: { team: { select: { id: true, name: true, ownerId: true } } },
    orderBy: { teamId: "asc" },
  });
  const teamCredits = await Promise.all(memberships.map(async (m) => {
    const teamId = m.teamId;
    const canManage = m.team.ownerId === session.userId || m.role === "owner" || m.role === "admin";
    const [balance, purchases, usage] = await Promise.all([
      getBalanceCredits({ userId: session.userId, teamId }),
      db.aiCreditPurchase.findMany({ where: { teamId }, orderBy: { id: "desc" }, take: 10 }),
      db.aiUsageLog.findMany({ where: { teamId }, orderBy: { id: "desc" }, take: 15 }),
    ]);
    let members: { userId: number; name: string; monthCredits: number; limitCredits: number | null }[] = [];
    if (canManage) {
      const rows = await db.teamMember.findMany({ where: { teamId }, orderBy: { userId: "asc" } });
      const users = await db.user.findMany({ where: { id: { in: rows.map((r) => r.userId) } }, select: { id: true, name: true } });
      const limits = await db.teamAiLimit.findMany({ where: { teamId } });
      members = await Promise.all(rows.map(async (r) => ({
        userId: r.userId,
        name: users.find((u) => u.id === r.userId)?.name ?? `User ${r.userId}`,
        monthCredits: unitsToCredits(await getMemberMonthUnits(teamId, r.userId)),
        limitCredits: (() => { const l = limits.find((x) => x.userId === r.userId); return l ? unitsToCredits(l.monthlyUnits) : null; })(),
      })));
    }
    const names = new Map<number, string>();
    if (canManage) members.forEach((mm) => names.set(mm.userId, mm.name));
    return {
      teamId, name: m.team.name, canManage, balance, members,
      purchases: purchases.map((p) => ({
        id: p.id, credits: unitsToCredits(p.units), source: p.source,
        description: p.description, createdAt: p.createdAt.toISOString(),
      })),
      usage: usage.map((u) => ({
        id: u.id, credits: unitsToCredits(u.costUnits), pageType: u.pageType, source: u.source,
        model: u.model, createdAt: u.createdAt.toISOString(),
        who: names.get(u.userId) ?? (u.userId === session.userId ? "You" : `User ${u.userId}`),
      })),
    };
  }));

  const userData = {
    id: user.id,
    name: user.name,
    email: user.email,
    tier: user.tier,
    storageUsed: Number(user.storageUsed),
    storageQuota: Number(user.storageQuota),
    stripeSubscriptionId: user.stripeSubscriptionId ?? null,
  };

  const teamsData = ownedTeams.map(t => ({
    id: t.id,
    name: t.name,
    tier: t.tier,
    seatCount: t.seatCount,
    storageUsed: Number(t.storageUsed),
    storageQuota: Number(t.storageQuota),
    stripeSubscriptionId: t.stripeSubscriptionId ?? null,
  }));

  return (
    <BillingPageClient
      user={userData}
      ownedTeams={teamsData}
      successTeamId={params.teamId ? Number(params.teamId) : null}
      showSuccess={params.success === "1"}
      showCreditsSuccess={params.credits === "1"}
      credits={creditsData}
      teamCredits={teamCredits}
    />
  );
}
