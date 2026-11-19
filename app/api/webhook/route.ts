import { NextRequest, NextResponse } from "next/server";
import { stripe, STORAGE_QUOTAS, priceIdToTier } from "@/utils/stripe";
import { db } from "@/utils/db";
import { grantCredits, WELCOME_GRANT_UNITS } from "@/utils/aiCredits";
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

      // A one-time AI credit purchase: add the credits. The session id makes this safe to
      // receive twice (Stripe retries webhooks).
      if (cs.mode === "payment" && cs.metadata?.kind === "credits") {
        const userId = Number(cs.metadata.userId);
        const units = BigInt(cs.metadata.units ?? "0");
        // metadata.teamId is set when a team admin bought the pack for the team's shared credits.
        const teamId = cs.metadata.teamId ? Number(cs.metadata.teamId) : null;
        if (cs.payment_status === "paid" && userId && units > BigInt(0)) {
          await grantCredits({
            userId, teamId, units, source: "stripe", reference: cs.id,
            description: teamId ? "AI credit pack (team)" : "AI credit pack",
          });
        }
        break;
      }

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

  // A user who starts paying gets a one-time AI credit allotment (once per user, however many
  // times this runs). A Business plan's allotment goes to the team owner.
  let grantUserId = userId;
  if (!grantUserId && tier === "business" && teamId) {
    const team = await db.team.findUnique({ where: { id: teamId }, select: { ownerId: true } });
    grantUserId = team?.ownerId ?? null;
  }
  if (grantUserId) {
    await grantCredits({
      userId: grantUserId, units: BigInt(WELCOME_GRANT_UNITS), source: "grant",
      reference: `welcome:${grantUserId}`, description: "Welcome credits for a paid plan",
    });
  }

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
