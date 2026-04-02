import { NextRequest, NextResponse } from "next/server";
import { stripe, PRICE_IDS, STORAGE_QUOTAS } from "@/utils/stripe";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  const body = await req.json() as {
    plan: "pro" | "business";
    interval: "monthly" | "yearly";
    seats?: number;
    teamId?: number;
  };
  const { plan, interval, seats = 1, teamId } = body;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const priceId = PRICE_IDS[plan][interval];

  if (plan === "pro") {
    const user = await db.user.findUniqueOrThrow({ where: { id: session.userId } });

    // Get or create Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: String(user.id) },
      });
      customerId = customer.id;
      await db.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/billing?success=1`,
      cancel_url: `${appUrl}/pricing`,
      metadata: { userId: String(user.id), plan: "pro" },
    });

    return NextResponse.json({ url: checkoutSession.url });
  }

  // Business plan — billed at team level
  if (!teamId) return NextResponse.json({ error: "teamId required for business plan" }, { status: 400 });

  const team = await db.team.findFirst({
    where: { id: teamId, ownerId: session.userId },
  });
  if (!team) return NextResponse.json({ error: "Team not found or not owner" }, { status: 403 });

  const user = await db.user.findUniqueOrThrow({ where: { id: session.userId } });

  let customerId = team.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: team.billingEmail ?? user.email,
      name: team.name,
      metadata: { teamId: String(teamId) },
    });
    customerId = customer.id;
    await db.team.update({ where: { id: teamId }, data: { stripeCustomerId: customerId } });
  }

  const seatCount = Math.max(1, seats);
  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: seatCount }],
    success_url: `${appUrl}/billing?success=1&teamId=${teamId}`,
    cancel_url: `${appUrl}/pricing`,
    metadata: { teamId: String(teamId), plan: "business", seats: String(seatCount) },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
