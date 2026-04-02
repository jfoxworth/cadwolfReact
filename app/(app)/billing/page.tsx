import { redirect } from "next/navigation";
import { getSessionUser } from "@/utils/getSessionUser";
import { db } from "@/utils/db";
import BillingPageClient from "@/components/billing/BillingPageClient";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; teamId?: string }>;
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
    />
  );
}
