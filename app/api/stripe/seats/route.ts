import { NextRequest, NextResponse } from "next/server";
import { stripe, STORAGE_QUOTAS } from "@/utils/stripe";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  const { teamId, seats } = await req.json() as { teamId: number; seats: number };

  if (!teamId || !seats || seats < 1) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const team = await db.team.findFirst({
    where: { id: teamId, ownerId: session.userId },
  });
  if (!team) return NextResponse.json({ error: "Team not found or not owner" }, { status: 403 });
  if (!team.stripeSubscriptionId) {
    return NextResponse.json({ error: "No active subscription" }, { status: 400 });
  }

  const subscription = await stripe.subscriptions.retrieve(team.stripeSubscriptionId);
  const itemId = subscription.items.data[0]?.id;
  if (!itemId) return NextResponse.json({ error: "Subscription item not found" }, { status: 500 });

  await stripe.subscriptions.update(team.stripeSubscriptionId, {
    items: [{ id: itemId, quantity: seats }],
    proration_behavior: "create_prorations",
  });

  await db.team.update({
    where: { id: teamId },
    data: {
      seatCount: seats,
      storageQuota: BigInt(STORAGE_QUOTAS.business_per_seat) * BigInt(seats),
    },
  });

  return NextResponse.json({ ok: true, seats });
}
