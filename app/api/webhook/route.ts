import { NextRequest, NextResponse } from "next/server";
import { stripe, STORAGE_QUOTAS, priceIdToTier } from "@/utils/stripe";
import { db } from "@/utils/db";
import Stripe from "stripe";

export const config = { api: { bodyParser: false } };

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const cs = event.data.object as Stripe.Checkout.Session;
      if (cs.mode !== "subscription" || !cs.subscription) break;

      const sub = await stripe.subscriptions.retrieve(cs.subscription as string);
      await syncSubscription(sub, cs.metadata ?? {});
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      await syncSubscription(sub, sub.metadata ?? {});
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await handleCancellation(sub);
      break;
    }
  }

  return NextResponse.json({ received: true });
}

async function syncSubscription(sub: Stripe.Subscription, meta: Record<string, string>) {
  const priceId = sub.items.data[0]?.price.id ?? "";
  const tier = priceIdToTier(priceId);
  if (!tier) return;

  const teamId = meta.teamId ? Number(meta.teamId) : null;
  const userId = meta.userId ? Number(meta.userId) : null;

  if (tier === "business" && teamId) {
    const seats = sub.items.data[0]?.quantity ?? 1;
    await db.team.update({
      where: { id: teamId },
      data: {
        tier: "business",
        seatCount: seats,
        storageQuota: BigInt(STORAGE_QUOTAS.business_per_seat) * BigInt(seats),
        stripeSubscriptionId: sub.id,
        stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      },
    });
  } else if (tier === "pro" && userId) {
    await db.user.update({
      where: { id: userId },
      data: {
        tier: "pro",
        storageQuota: BigInt(STORAGE_QUOTAS.pro),
        stripeSubscriptionId: sub.id,
        stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      },
    });
  }
}

async function handleCancellation(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  const user = await db.user.findFirst({ where: { stripeSubscriptionId: sub.id } });
  if (user) {
    await db.user.update({
      where: { id: user.id },
      data: {
        tier: "free",
        storageQuota: BigInt(STORAGE_QUOTAS.free),
        stripeSubscriptionId: null,
      },
    });
    return;
  }

  const team = await db.team.findFirst({ where: { stripeSubscriptionId: sub.id } });
  if (team) {
    await db.team.update({
      where: { id: team.id },
      data: {
        tier: "free",
        seatCount: 0,
        storageQuota: BigInt(0),
        stripeSubscriptionId: null,
      },
    });
  }
}
